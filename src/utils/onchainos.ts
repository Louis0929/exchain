import { execFile } from "node:child_process";
import { promisify } from "node:util";
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

const execFileAsync = promisify(execFile);

const ONCHAINOS_BIN = process.env.ONCHAINOS_BIN || "onchainos";

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
  // OnchainOS may output JSON mixed with status lines; extract the JSON block
  const lines = stdout.trim().split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("{") || lines[i].trim().startsWith("[")) {
      return JSON.parse(lines.slice(i).join("\n")) as T;
    }
  }
  throw new Error(`No JSON found in onchainos output: ${stdout.slice(0, 200)}`);
}

async function run<T>(args: string[]): Promise<T> {
  const { stdout, stderr } = await execFileAsync(ONCHAINOS_BIN, args, {
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
  return run<PortfolioTotalValue>([
    "portfolio", "total-value",
    "--address", address,
    "--chains", chainIndexes,
  ]);
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
  return run<PnLOverview>([
    "market", "portfolio-overview",
    "--address", address,
    "--chain", chainIndex,
    "--time-frame", "4", // 1M (default)
  ]);
}

export async function getTokenPnL(
  address: string,
  chain: string,
  token?: string
): Promise<TokenPnL[]> {
  const chainIndex = getChainIndex(chain);
  const supportedChains = await getPortfolioSupportedChains();
  if (!supportedChains.includes(chainIndex) || !token) {
    return [];
  }
  return run<TokenPnL[]>([
    "market", "portfolio-token-pnl",
    "--address", address,
    "--chain", chainIndex,
    "--token", token,
  ]);
}

export async function getDexHistory(
  address: string,
  chain: string,
  beginMs?: number,
  endMs?: number
): Promise<DexTrade[]> {
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
