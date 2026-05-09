import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
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

// --- Config ---

const OKX_BASE_URL = process.env.OKX_BASE_URL || "https://web3.okx.com";
const OKX_API_KEY = process.env.OKX_API_KEY || "";
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY || "";
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE || "";
const OKX_ACCESS_TOKEN = process.env.OKX_ACCESS_TOKEN || "";

const HAS_API_KEY = !!(OKX_API_KEY && OKX_SECRET_KEY && OKX_PASSPHRASE);
const HAS_JWT = !!OKX_ACCESS_TOKEN;
const IS_AUTHENTICATED = HAS_API_KEY || HAS_JWT;

// Direct HTTP for public endpoints (no auth needed); CLI fallback for authenticated endpoints
const USE_DIRECT_API = HAS_API_KEY || HAS_JWT;

// --- CLI fallback ---

let ONCHAINOS_BIN = process.env.ONCHAINOS_BIN;
if (!ONCHAINOS_BIN) {
  const homedir = os.homedir();
  let foundPath = "onchainos";
  if (os.platform() === "win32") {
    const possiblePaths = [
      path.join(homedir, ".local", "bin", "onchainos.exe"),
      path.join(process.env.ProgramFiles || "", "onchainos", "onchainos.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "", "onchainos", "onchainos.exe"),
    ];
    for (const p of possiblePaths) { if (fs.existsSync(p)) { foundPath = p; break; } }
  } else if (os.platform() === "darwin" || os.platform() === "linux") {
    const possiblePaths = [
      path.join(homedir, ".local", "bin", "onchainos"),
      "/usr/local/bin/onchainos",
      "/usr/bin/onchainos",
    ];
    for (const p of possiblePaths) { if (fs.existsSync(p)) { foundPath = p; break; } }
  }
  ONCHAINOS_BIN = foundPath;
}

// --- Chain map ---

const CHAIN_MAP: Record<string, string> = {
  ethereum: "1",
  sepolia: "11155111",
  base: "8453",
  bsc: "56",
  arbitrum: "42161",
  solana: "501",
  xlayer: "196",
  bitcoin: "0",
  polygon: "137",
  optimism: "10",
  avalanche: "43114",
  fantom: "250",
  cronos: "25",
  celo: "42220",
  polygon_zkevm: "1101",
  linea: "59144",
};

function getChainIndex(chain: string): string {
  return CHAIN_MAP[chain.toLowerCase()] || chain;
}

// --- Direct HTTP client ---

function signRequest(timestamp: string, method: string, path: string, body?: string): string {
  const message = timestamp + method.toUpperCase() + path + (body || "");
  return crypto.createHmac("sha256", OKX_SECRET_KEY).update(message).digest("base64");
}

async function httpGet<T>(apiPath: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const fullPath = `${apiPath}?${qs}`;
  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "OK-ACCESS-TIMESTAMP": timestamp,
  };

  if (OKX_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${OKX_ACCESS_TOKEN}`;
  } else if (OKX_API_KEY) {
    headers["OK-ACCESS-KEY"] = OKX_API_KEY;
    headers["OK-ACCESS-SIGN"] = signRequest(timestamp, "GET", fullPath);
    headers["OK-ACCESS-PASSPHRASE"] = OKX_PASSPHRASE;
  }

  const url = `${OKX_BASE_URL}${fullPath}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OKX API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.code !== "0") throw new Error(`OKX API error: ${json.msg || json.code}`);
  return json.data as T;
}

// --- CLI runner (fallback) ---

function parseJson<T>(stdout: string): T {
  const trimmed = stdout.trim();
  const startIndex = Math.min(
    trimmed.indexOf("{") !== -1 ? trimmed.indexOf("{") : Infinity,
    trimmed.indexOf("[") !== -1 ? trimmed.indexOf("[") : Infinity
  );
  if (startIndex === Infinity) throw new Error(`No JSON found in onchainos output: ${trimmed.slice(0, 200)}`);
  let depth = 0;
  let endIndex = startIndex;
  const startChar = trimmed[startIndex];
  const endChar = startChar === "{" ? "}" : "]";
  for (let i = startIndex; i < trimmed.length; i++) {
    if (trimmed[i] === startChar) depth++;
    else if (trimmed[i] === endChar) { depth--; if (depth === 0) { endIndex = i + 1; break; } }
  }
  if (depth > 0) throw new Error(`Incomplete JSON in onchainos output: ${trimmed.slice(startIndex, startIndex + 200)}`);
  return JSON.parse(trimmed.slice(startIndex, endIndex)) as T;
}

async function runCli<T>(args: string[]): Promise<T> {
  const cmd = `"${ONCHAINOS_BIN}" ${args.join(" ")}`;
  console.log("[CLI]", cmd);
  const { stdout, stderr } = await execAsync(cmd, { timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (stderr && !stdout) throw new Error(`OnchainOS error: ${stderr}`);
  return parseJson<T>(stdout);
}

console.log(`OnchainOS mode: direct HTTP (public) + ${IS_AUTHENTICATED ? "direct HTTP (auth)" : `CLI fallback (bin: ${ONCHAINOS_BIN})`}`);

// --- Supported chains cache ---

let _supportedChainsCache: string[] | null = null;
let _supportedChainsExpiry = 0;

async function getSupportedChains(): Promise<string[]> {
  if (_supportedChainsCache && Date.now() < _supportedChainsExpiry) return _supportedChainsCache;
  try {
    if (IS_AUTHENTICATED) {
      const data = await httpGet<{ chainIndex: string }[]>("/api/v6/dex/market/portfolio/supported/chain", {});
      _supportedChainsCache = data.map(c => c.chainIndex);
    } else {
      const result = await runCli<{ data: { chainIndex: string }[] }>(["market", "portfolio-supported-chains"]);
      _supportedChainsCache = result.data.map(c => c.chainIndex);
    }
  } catch {
    _supportedChainsCache = ["1", "56", "8453", "42161"]; // Fallback: ETH, BSC, Base, Arbitrum
  }
  _supportedChainsExpiry = Date.now() + 300_000;
  return _supportedChainsCache;
}

// --- Portfolio ---

// --- Portfolio (try direct HTTP, fallback to CLI on auth failure) ---

export async function getTotalValue(address: string, chains: string[]): Promise<PortfolioTotalValue> {
  const chainIndexes = chains.map(getChainIndex).join(",");

  // Try direct HTTP first
  if (IS_AUTHENTICATED) {
    try {
      const data = await httpGet<{ totalValue: string }[]>("/api/v6/dex/balance/total-value-by-address", { address, chains: chainIndexes });
      const totalUsd = data.length > 0 ? parseFloat(data[0].totalValue) : 0;
      const chainsObj: Record<string, number> = {};
      chains.forEach(c => { chainsObj[c] = totalUsd / chains.length; });
      return { totalUsd, chains: chainsObj };
    } catch {
      // Fall through to CLI
    }
  }

  // CLI fallback (has login session)
  const result = await runCli<{ ok: boolean; data: { totalValue: string }[] }>(["portfolio", "total-value", "--address", address, "--chains", chainIndexes]);
  const totalUsd = result.data.length > 0 ? parseFloat(result.data[0].totalValue) : 0;
  const chainsObj: Record<string, number> = {};
  chains.forEach(c => { chainsObj[c] = totalUsd / chains.length; });
  return { totalUsd, chains: chainsObj };
}

export async function getAllBalances(address: string, chains: string[]): Promise<PortfolioBalances> {
  const chainIndexes = chains.map(getChainIndex).join(",");

  if (IS_AUTHENTICATED) {
    try {
      return await httpGet<PortfolioBalances>("/api/v6/dex/balance/all-token-balances-by-address", { address, chains: chainIndexes });
    } catch {
      // Fall through to CLI
    }
  }

  return runCli<PortfolioBalances>(["portfolio", "all-balances", "--address", address, "--chains", chainIndexes]);
}

// --- Market / PnL (AUTHENTICATED endpoints - need OKX account) ---

export async function getPortfolioOverview(address: string, chain: string): Promise<PnLOverview> {
  const chainIndex = getChainIndex(chain);
  const emptyPnl: PnLOverview = { address, totalPnlUsd: 0, winRate: 0, tradeCount: 0, avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 } };

  const supported = await getSupportedChains();
  if (!supported.includes(chainIndex)) return emptyPnl;

  try {
    if (IS_AUTHENTICATED) {
      const data = await httpGet<any>("/api/v6/dex/market/portfolio/overview", { address, chainIndex, timeFrame: "4" });
      const d = Array.isArray(data) ? data[0] : data;
      return {
        address,
        totalPnlUsd: parseFloat(d.realizedPnlUsd) || 0,
        winRate: parseFloat(d.winRate) || 0,
        tradeCount: (parseInt(d.buyTxCount) || 0) + (parseInt(d.sellTxCount) || 0),
        avgHoldingTime: "0",
        bestTrade: { token: "", pnlUsd: 0 },
        worstTrade: { token: "", pnlUsd: 0 },
      };
    }
    const result = await runCli<{ ok: boolean; data: any }>(["market", "portfolio-overview", "--address", address, "--chain", chainIndex, "--time-frame", "4"]);
    return {
      address,
      totalPnlUsd: parseFloat(result.data.realizedPnlUsd) || 0,
      winRate: parseFloat(result.data.winRate) || 0,
      tradeCount: (parseInt(result.data.buyTxCount) || 0) + (parseInt(result.data.sellTxCount) || 0),
      avgHoldingTime: "0",
      bestTrade: { token: "", pnlUsd: 0 },
      worstTrade: { token: "", pnlUsd: 0 },
    };
  } catch {
    return emptyPnl;
  }
}

export async function getTokenPnL(address: string, chain: string, token?: string): Promise<TokenPnL[]> {
  if (!token) return [];
  const chainIndex = getChainIndex(chain);
  try {
    const supported = await getSupportedChains();
    if (!supported.includes(chainIndex)) return [];
    if (IS_AUTHENTICATED) {
      return httpGet<TokenPnL[]>("/api/v6/dex/market/portfolio/token/latest-pnl", { address, chainIndex, token });
    }
    return runCli<TokenPnL[]>(["market", "portfolio-token-pnl", "--address", address, "--chain", chainIndex, "--token", token]);
  } catch (err) {
    console.warn(`getTokenPnL failed: ${(err as Error).message}`);
    return [];
  }
}

export async function getDexHistory(address: string, chain: string, beginMs?: number, endMs?: number): Promise<DexTrade[]> {
  const chainIndex = getChainIndex(chain);
  const supported = await getSupportedChains();
  if (!supported.includes(chainIndex) || !beginMs || !endMs) return [];
  try {
    if (IS_AUTHENTICATED) {
      return httpGet<DexTrade[]>("/api/v6/dex/market/portfolio/dex-history", { address, chainIndex, begin: String(beginMs), end: String(endMs) });
    }
    return runCli<DexTrade[]>(["market", "portfolio-dex-history", "--address", address, "--chain", chainIndex, "--begin", String(beginMs), "--end", String(endMs)]);
  } catch {
    return [];
  }
}

export async function getPortfolioSupportedChains(): Promise<string[]> {
  return getSupportedChains();
}

// --- Signal ---

export async function getSmartMoneyLeaderboard(): Promise<SmartMoneyEntry[]> {
  if (USE_DIRECT_API) {
    // Signal endpoints not mapped yet — fallback to CLI
    return runCli<SmartMoneyEntry[]>(["signal", "leaderboard"]);
  }
  return runCli<SmartMoneyEntry[]>(["signal", "leaderboard"]);
}

// --- Gateway ---

export async function estimateGas(chain: string, to: string, data: string, value?: string): Promise<GasEstimate> {
  const args = ["gateway", "estimate-gas", "--chain", chain, "--to", to, "--input-data", data];
  if (value) args.push("--value", value);
  return runCli<GasEstimate>(args);
}

export async function simulateTx(chain: string, from: string, to: string, data: string, value?: string): Promise<TxSimulation> {
  const args = ["gateway", "simulate-tx", "--chain", chain, "--from", from, "--to", to, "--input-data", data];
  if (value) args.push("--value", value);
  return runCli<TxSimulation>(args);
}

export async function broadcastTx(chain: string, signedTx: string): Promise<TxBroadcastResult> {
  return runCli<TxBroadcastResult>(["gateway", "broadcast-tx", "--chain", chain, "--signed-tx", signedTx]);
}

// --- Security ---

export async function txScan(chain: string): Promise<SecurityScanResult> {
  return runCli<SecurityScanResult>(["security", "tx-scan", "--chain", chain]);
}

// --- Wallet ---

export async function getWalletStatus(): Promise<WalletStatus> {
  return runCli<WalletStatus>(["wallet", "status"]);
}

export async function walletLogin(email: string): Promise<{ message: string }> {
  return runCli<{ message: string }>(["wallet", "login", email, "--locale", "zh-CN"]);
}

export async function walletVerify(code: string): Promise<{ success: boolean }> {
  return runCli<{ success: boolean }>(["wallet", "verify", code]);
}

export async function walletBalance(chain: string): Promise<{ balances: { token: string; amount: number }[] }> {
  return runCli(["wallet", "balance", "--chain", chain]);
}

export async function walletSend(chain: string, recipient: string, amount: string, options?: { contractToken?: boolean }): Promise<TxBroadcastResult> {
  const args = ["wallet", "send", "--chain", chain, "--recipient", recipient, "--readable-amount", amount];
  if (options?.contractToken) args.push("--contract-token");
  return runCli<TxBroadcastResult>(args);
}

export async function walletContractCall(chain: string, to: string, inputData: string): Promise<TxBroadcastResult> {
  return runCli<TxBroadcastResult>(["wallet", "contract-call", "--chain", chain, "--to", to, "--input-data", inputData]);
}
