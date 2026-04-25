import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type {
  PortfolioTotalValue,
  PortfolioBalances,
  PnLOverview,
  TokenPnL,
  DexTrade,
  SmartMoneyEntry,
  GasEstimate,
  TxSimulation,
  SecurityScanResult,
  TxBroadcastResult,
  WalletStatus,
} from "../types/onchainos.js";

const execAsync = promisify(exec);

// Determine onchainos executable path based on OS
let ONCHAINOS_BIN = process.env.ONCHAINOS_BIN;
if (!ONCHAINOS_BIN) {
  const homedir = os.homedir();
  let foundPath = "onchainos"; // Default to system PATH

  if (os.platform() === "win32") {
    const possiblePaths = [
      path.join(homedir, ".local", "bin", "onchainos.exe"),
      path.join(process.env.ProgramFiles || "", "onchainos", "onchainos.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "", "onchainos", "onchainos.exe"),
    ];
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        break;
      }
    }
  } else if (os.platform() === "darwin" || os.platform() === "linux") {
    const possiblePaths = [
      path.join(homedir, ".local", "bin", "onchainos"),
      "/usr/local/bin/onchainos",
      "/usr/bin/onchainos",
    ];
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        break;
      }
    }
  }

  ONCHAINOS_BIN = foundPath;
}
console.log("ONCHAINOS_BIN:", ONCHAINOS_BIN);

// Chain name to chain index mapping
const CHAIN_MAP: Record<string, string> = {
  ethereum: "1",
  sepolia: "11155111",
  base: "8453",
  bsc: "56",
  arbitrum: "42161",
  solana: "501",
  xlayer: "196",
};

function getChainIndex(chain: string): string {
  return CHAIN_MAP[chain.toLowerCase()] || chain;
}

function parseJson<T>(stdout: string): T {
  // OnchainOS may output JSON mixed with status lines; extract the first complete JSON block
  const trimmed = stdout.trim();
  const startIndex = Math.min(
    trimmed.indexOf("{") !== -1 ? trimmed.indexOf("{") : Infinity,
    trimmed.indexOf("[") !== -1 ? trimmed.indexOf("[") : Infinity
  );
  if (startIndex === Infinity) {
    throw new Error(`No JSON found in onchainos output: ${trimmed.slice(0, 200)}`);
  }

  let depth = 0;
  let endIndex = startIndex;
  const startChar = trimmed[startIndex];
  const endChar = startChar === "{" ? "}" : "]";

  for (let i = startIndex; i < trimmed.length; i++) {
    if (trimmed[i] === startChar) {
      depth++;
    } else if (trimmed[i] === endChar) {
      depth--;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (depth > 0) {
    throw new Error(`Incomplete JSON found in onchainos output: ${trimmed.slice(startIndex, startIndex + 200)}`);
  }

  const jsonStr = trimmed.slice(startIndex, endIndex);
  try {
    return JSON.parse(jsonStr) as T;
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON: ${parseErr.message}\nContent: ${jsonStr.slice(0, 200)}`);
  }
}

async function run<T>(args: string[]): Promise<T> {
  const cmd = `"${ONCHAINOS_BIN}" ${args.join(" ")}`;
  console.log("Executing command:", cmd);
  const { stdout, stderr } = await execAsync(cmd, {
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });

  if (stderr && !stdout) {
    throw new Error(`OnchainOS error: ${stderr}`);
  }

  return parseJson<T>(stdout);
}

// --- Portfolio ---

export async function getTotalValue(
  address: string,
  chains: string[]
): Promise<PortfolioTotalValue> {
  const chainIndexes = chains.map(getChainIndex).join(",");
  const result = await run<{ ok: boolean; data: { totalValue: string }[] }>([
    "portfolio", "total-value",
    "--address", address,
    "--chains", chainIndexes,
  ]);
  // Parse the API response to match our type
  const totalUsd = result.data.length > 0 ? parseFloat(result.data[0].totalValue) : 0;
  const chainsObj: Record<string, number> = {};
  chains.forEach(chain => {
    chainsObj[chain] = totalUsd / chains.length; // Approximate per chain
  });
  return { totalUsd, chains: chainsObj };
}

export async function getAllBalances(
  address: string,
  chains: string[]
): Promise<PortfolioBalances> {
  const chainIndexes = chains.map(getChainIndex).join(",");
  return run<PortfolioBalances>([
    "portfolio", "all-balances",
    "--address", address,
    "--chains", chainIndexes,
  ]);
}

// --- Market / PnL ---

export async function getPortfolioOverview(
  address: string,
  chain: string
): Promise<PnLOverview> {
  const chainIndex = getChainIndex(chain);
  // Check if chain is supported for PnL
  const supportedChains = await getPortfolioSupportedChains();
  if (!supportedChains.includes(chainIndex)) {
    return { address, totalPnlUsd: 0, winRate: 0, tradeCount: 0, avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 } };
  }
  const result = await run<{ ok: boolean; data: any }>([
    "market", "portfolio-overview",
    "--address", address,
    "--chain", chainIndex,
    "--time-frame", "4", // 1M (default)
  ]);
  // Parse the API response to match our type
  return {
    address,
    totalPnlUsd: parseFloat(result.data.realizedPnlUsd) || 0,
    winRate: parseFloat(result.data.winRate) || 0,
    tradeCount: parseInt(result.data.buyTxCount) + parseInt(result.data.sellTxCount) || 0,
    avgHoldingTime: "0", // API doesn't provide this for now
    bestTrade: { token: "", pnlUsd: 0 }, // API doesn't provide this for now
    worstTrade: { token: "", pnlUsd: 0 }, // API doesn't provide this for now
  };
}

export async function getTokenPnL(
  address: string,
  chain: string,
  token?: string
): Promise<TokenPnL[]> {
  const chainIndex = getChainIndex(chain);
  if (!token) {
    return []; // Return empty array if no token is provided, not an error
  }
  try {
    const supportedChains = await getPortfolioSupportedChains();
    if (!supportedChains.includes(chainIndex)) {
      return [];
    }
    return run<TokenPnL[]>([
      "market", "portfolio-token-pnl",
      "--address", address,
      "--chain", chainIndex,
      "--token", token,
    ]);
  } catch (err) {
    console.warn(`getTokenPnL failed: ${(err as Error).message}`);
    return [];
  }
}

export async function getDexHistory(
  address: string,
  chain: string,
  beginMs?: number,
  endMs?: number
): Promise<DexTrade[]> {
  console.log("getDexHistory params:", { address, chain, beginMs, endMs });
  const chainIndex = getChainIndex(chain);
  const supportedChains = await getPortfolioSupportedChains();
  if (!supportedChains.includes(chainIndex) || !beginMs || !endMs) {
    return [];
  }
  const args = [
    "market", "portfolio-dex-history",
    "--address", address,
    "--chain", chainIndex,
    "--begin", String(beginMs),
    "--end", String(endMs),
  ];
  return run<DexTrade[]>(args);
}

export async function getPortfolioSupportedChains(): Promise<string[]> {
  const result = await run<{ data: { chainIndex: string }[] }>(["market", "portfolio-supported-chains"]);
  return result.data.map(chain => chain.chainIndex);
}

// --- Signal ---

export async function getSmartMoneyLeaderboard(): Promise<SmartMoneyEntry[]> {
  return run<SmartMoneyEntry[]>(["signal", "leaderboard"]);
}

// --- Gateway ---

export async function estimateGas(
  chain: string,
  to: string,
  data: string,
  value?: string
): Promise<GasEstimate> {
  const args = [
    "gateway", "estimate-gas",
    "--chain", chain,
    "--to", to,
    "--input-data", data,
  ];
  if (value) args.push("--value", value);
  return run<GasEstimate>(args);
}

export async function simulateTx(
  chain: string,
  from: string,
  to: string,
  data: string,
  value?: string
): Promise<TxSimulation> {
  const args = [
    "gateway", "simulate-tx",
    "--chain", chain,
    "--from", from,
    "--to", to,
    "--input-data", data,
  ];
  if (value) args.push("--value", value);
  return run<TxSimulation>(args);
}

export async function broadcastTx(
  chain: string,
  signedTx: string
): Promise<TxBroadcastResult> {
  return run<TxBroadcastResult>([
    "gateway", "broadcast-tx",
    "--chain", chain,
    "--signed-tx", signedTx,
  ]);
}

// --- Security ---

export async function txScan(chain: string): Promise<SecurityScanResult> {
  return run<SecurityScanResult>([
    "security", "tx-scan",
    "--chain", chain,
  ]);
}

// --- Wallet ---

export async function getWalletStatus(): Promise<WalletStatus> {
  return run<WalletStatus>(["wallet", "status"]);
}

export async function walletLogin(email: string): Promise<{ message: string }> {
  return run<{ message: string }>(["wallet", "login", email, "--locale", "zh-CN"]);
}

export async function walletVerify(code: string): Promise<{ success: boolean }> {
  return run<{ success: boolean }>(["wallet", "verify", code]);
}

export async function walletBalance(chain: string): Promise<{ balances: { token: string; amount: number }[] }> {
  return run(["wallet", "balance", "--chain", chain]);
}

export async function walletSend(
  chain: string,
  recipient: string,
  amount: string,
  options?: { contractToken?: boolean }
): Promise<TxBroadcastResult> {
  const args = [
    "wallet", "send",
    "--chain", chain,
    "--recipient", recipient,
    "--readable-amount", amount,
  ];
  if (options?.contractToken) args.push("--contract-token");
  return run<TxBroadcastResult>(args);
}

export async function walletContractCall(
  chain: string,
  to: string,
  inputData: string
): Promise<TxBroadcastResult> {
  return run<TxBroadcastResult>([
    "wallet", "contract-call",
    "--chain", chain,
    "--to", to,
    "--input-data", inputData,
  ]);
}
