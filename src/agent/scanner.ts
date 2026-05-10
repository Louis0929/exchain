import * as oc from "../utils/onchainos.js";
import type {
  PortfolioTotalValue,
  PortfolioBalances,
  PnLOverview,
  TokenPnL,
  DexTrade,
} from "../types/onchainos.js";
import type { BehavioralProfile, BalanceDerivedMetrics, DataConfidence } from "../types/exchain.js";

export interface ScanResult {
  totalValue: PortfolioTotalValue;
  balances: PortfolioBalances;
  pnlOverview: PnLOverview;
  tokenPnL: TokenPnL[];
  tradeHistory: DexTrade[];
  behavioralProfile: BehavioralProfile;
  pnlConfidence: DataConfidence;
  scanMeta: {
    chainsScanned: string[];
    dominantChain: string;
    dominantChainReason: string;
    strategySwitch: boolean;
    strategySwitchReason?: string;
  };
}

const DEFAULT_CHAINS = ["ethereum", "base", "bsc", "arbitrum", "polygon", "optimism", "avalanche"];

const RETRY_DELAYS = [500, 1500, 3000];

const MEME_PATTERNS = /doge|pepe|shib|floki|wojak|bonk|meme|trump|fart|ponke|neiro|mog/i;
const STABLE_PATTERNS = /^usdc$|^usdt$|^dai$|^busd$|^frax$|^tusd$/i;
const BLUECHIP_PATTERNS = /^eth$|^btc$|^wbtc$|^weth$|^bnb$|^sol$|^matic$/i;

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("429") || msg.includes("rate") || msg.includes("too many")) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        console.warn(`[Rate Limit] ${label} throttled, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET")) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        console.warn(`[Timeout] ${label} timed out, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${label} failed after ${retries} retries`);
}

function extractBalanceDerivedMetrics(
  allTokens: { symbol: string; valueUsd: number }[],
  totalValueUsd: number,
): BalanceDerivedMetrics {
  const total = totalValueUsd || 1;

  const memeTokens = allTokens.filter(t => MEME_PATTERNS.test(t.symbol));
  const stableTokens = allTokens.filter(t => STABLE_PATTERNS.test(t.symbol));
  const bluechipTokens = allTokens.filter(t => BLUECHIP_PATTERNS.test(t.symbol));

  const memeTokenValueUsd = memeTokens.reduce((s, t) => s + t.valueUsd, 0);
  const stableValueUsd = stableTokens.reduce((s, t) => s + t.valueUsd, 0);
  const bluechipValueUsd = bluechipTokens.reduce((s, t) => s + t.valueUsd, 0);

  const memeTokenRatio = memeTokenValueUsd / total;
  const stablecoinRatio = stableValueUsd / total;
  const bluechipRatio = bluechipValueUsd / total;

  // Herfindahl index: sum of (weight^2) across all tokens
  // Low herfindahl = diversified, high = concentrated
  const weights = allTokens.map(t => t.valueUsd / total);
  const herfindahl = weights.reduce((s, w) => s + w * w, 0);
  // diversificationScore: 0 for single-token, ~100 for well-distributed
  const diversificationScore = Math.min(100, Math.round((1 - herfindahl) / 0.8 * 100));
  const concentrationRisk = 100 - diversificationScore;

  // Top token
  const sorted = [...allTokens].sort((a, b) => b.valueUsd - a.valueUsd);
  const topTokenSymbol = sorted.length > 0 ? sorted[0].symbol : "";
  const topTokenRatio = sorted.length > 0 ? sorted[0].valueUsd / total : 0;

  return {
    memeTokenCount: memeTokens.length,
    memeTokenValueUsd,
    memeTokenRatio: Math.round(memeTokenRatio * 1000) / 1000,
    stablecoinRatio: Math.round(stablecoinRatio * 1000) / 1000,
    bluechipRatio: Math.round(bluechipRatio * 1000) / 1000,
    tokenCount: allTokens.length,
    diversificationScore,
    concentrationRisk,
    topTokenSymbol,
    topTokenRatio: Math.round(topTokenRatio * 1000) / 1000,
  };
}

function computeBalanceDerivedDegenScore(metrics: BalanceDerivedMetrics): number {
  let score = 0;
  score += metrics.memeTokenRatio * 50;          // 0-50 for meme exposure
  score += (1 - metrics.stablecoinRatio) * 15;   // 0-15 for low stablecoin
  score += (1 - metrics.bluechipRatio) * 15;     // 0-15 for low bluechip
  if (metrics.tokenCount > 20) score += 10;
  else if (metrics.tokenCount > 10) score += 5;
  if (metrics.concentrationRisk > 80 && metrics.memeTokenRatio > 0.1) score += 10;
  return Math.min(100, Math.round(score));
}

function extractBehavioralProfile(
  scanResult: { tokenPnL: TokenPnL[]; tradeHistory: DexTrade[]; balances: PortfolioBalances; totalValue: { totalUsd: number; chains?: Record<string, number> } },
  pnlOverview: PnLOverview,
): BehavioralProfile {
  const trades = Array.isArray(scanResult.tradeHistory) ? scanResult.tradeHistory : [];
  const tokens = Array.isArray(scanResult.tokenPnL) ? scanResult.tokenPnL : [];
  const allTokens = (scanResult.balances?.chains || []).flatMap((c) => c?.tokens || []);

  const hasDexData = trades.length > 0 || tokens.length > 0;
  const balanceMetrics = extractBalanceDerivedMetrics(allTokens, scanResult.totalValue.totalUsd);

  // Chain activity distribution
  const chainActivity: Record<string, number> = {};
  for (const chain of Object.keys(scanResult.totalValue.chains || {})) {
    chainActivity[chain] = (scanResult.totalValue.chains || {})[chain] || 0;
  }
  for (const trade of trades) {
    const c = trade.chain || "unknown";
    chainActivity[c] = (chainActivity[c] || 0) + (trade.valueUsd || 0);
  }

  let dominantChain = "ethereum";
  let maxActivity = 0;
  for (const [chain, value] of Object.entries(chainActivity)) {
    if (value > maxActivity) {
      maxActivity = value;
      dominantChain = chain;
    }
  }

  const dominantChainReason = maxActivity > 0
    ? `Highest activity: $${Math.round(maxActivity).toLocaleString()} on-chain value`
    : "Default chain (no significant activity detected)";

  if (hasDexData) {
    // DEX data available — use real trade/PnL metrics
    const losingTrades = tokens.filter(t => t.pnlPercent < -5);
    const avgSlippageLoss = losingTrades.length > 0
      ? losingTrades.reduce((s, t) => s + Math.abs(t.pnlPercent), 0) / losingTrades.length
      : 0;

    const memeTrades = trades.filter(t =>
      MEME_PATTERNS.test(t.tokenIn || "") || MEME_PATTERNS.test(t.tokenOut || "")
    );
    const memeTradeFrequency = trades.length > 0
      ? memeTrades.length / trades.length
      : (balanceMetrics.memeTokenCount > 0 ? 0.5 : 0);

    const rugPullCount = tokens.filter(t =>
      t.pnlPercent < -80 && t.holdingValueUsd < 10 && t.buyUsd > 50
    ).length;

    const highRiskTradeCount = tokens.filter(t =>
      t.pnlPercent < -50 && t.buyUsd > 100
    ).length;

    const degenScore = Math.min(100, Math.round(
      (avgSlippageLoss * 0.3) +
      (memeTradeFrequency * 40) +
      (rugPullCount * 15) +
      (highRiskTradeCount * 5)
    ));

    return {
      avgSlippageLoss: Math.round(avgSlippageLoss * 100) / 100,
      memeTradeFrequency: Math.round(memeTradeFrequency * 100) / 100,
      rugPullCount,
      highRiskTradeCount,
      degenScore,
      chainActivity,
      dominantChain,
      dominantChainReason,
      confidence: "confirmed",
      dataSource: "dex_history",
      balanceDerivedMetrics: balanceMetrics,
    };
  }

  // No DEX data — derive from token holdings
  if (allTokens.length > 0) {
    const degenScore = computeBalanceDerivedDegenScore(balanceMetrics);

    return {
      avgSlippageLoss: 0,
      memeTradeFrequency: balanceMetrics.memeTokenRatio,
      rugPullCount: 0,
      highRiskTradeCount: 0,
      degenScore,
      chainActivity,
      dominantChain,
      dominantChainReason,
      confidence: "estimated",
      dataSource: "balances",
      balanceDerivedMetrics: balanceMetrics,
    };
  }

  // No data at all
  return {
    avgSlippageLoss: 0,
    memeTradeFrequency: 0,
    rugPullCount: 0,
    highRiskTradeCount: 0,
    degenScore: 0,
    chainActivity,
    dominantChain,
    dominantChainReason,
    confidence: "unavailable",
    dataSource: "none",
  };
}

export async function scanWallet(
  address: string,
  chains: string[] = DEFAULT_CHAINS,
  primaryChain = "ethereum",
  beginDate?: string,
  endDate?: string
): Promise<ScanResult> {
  let beginMs: number | undefined;
  let endMs: number | undefined;

  // Detect address type based on format
  if (address.startsWith("bc1")) {
    chains = ["bitcoin"];
    primaryChain = "bitcoin";
  } else if (address.startsWith("1") || address.startsWith("3")) {
    chains = ["bitcoin"];
    primaryChain = "bitcoin";
  } else if (address.length === 44 && /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address)) {
    chains = ["solana"];
    primaryChain = "solana";
  } else if (!address.startsWith("0x")) {
    chains = ["ethereum"];
    primaryChain = "ethereum";
  }

  if (beginDate) {
    beginMs = new Date(beginDate).getTime();
  }
  if (endDate) {
    endMs = new Date(endDate).getTime();
  }

  let strategySwitch = false;
  let strategySwitchReason: string | undefined;

  // Phase 1: Concurrent multi-chain data fetch with retry
  const [totalValue, balances, pnlOverview, tokenPnL, tradeHistory] =
    await Promise.all([
      withRetry(() => oc.getTotalValue(address, chains), "total-value").catch((e) => {
        console.warn(`total-value failed after retries: ${e.message}`);
        return { totalUsd: 0, chains: {} };
      }),
      (primaryChain === "solana"
        ? Promise.resolve({ address, chains: [] } as PortfolioBalances)
        : withRetry(() => oc.getAllBalances(address, chains), "all-balances").catch((e) => {
            console.warn(`all-balances failed after retries: ${e.message}`);
            return { address, chains: [] } as PortfolioBalances;
          })
      ),
      withRetry(() => oc.getPortfolioOverview(address, primaryChain), "portfolio-overview").catch((e) => {
        console.warn(`portfolio-overview failed after retries: ${e.message}`);
        return { address, totalPnlUsd: 0, winRate: 0, tradeCount: 0, avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 } } as PnLOverview;
      }),
      (async () => {
        try {
          return await withRetry(() => oc.getTokenPnL(address, primaryChain), "token-pnl");
        } catch (e: any) {
          console.warn(`token-pnl failed after retries: ${e.message}`);
          return [];
        }
      })(),
      withRetry(() => oc.getDexHistory(address, primaryChain, beginMs, endMs), "dex-history").catch((e) => {
        console.warn(`dex-history failed after retries: ${e.message}`);
        return [];
      }),
    ]);

  // Phase 2: Dynamic chain switching — if primary chain shows low activity, auto-switch
  let effectivePnlOverview = pnlOverview;
  let effectiveTokenPnL = tokenPnL;
  let effectiveTradeHistory = tradeHistory;
  let effectiveDominantChain = primaryChain;

  if (pnlOverview.tradeCount < 3 && chains.length > 1 && primaryChain !== "solana" && primaryChain !== "bitcoin") {
    const alternativeChains = chains.filter(c => c !== primaryChain);
    console.log(`[Agent] Low activity on ${primaryChain} (${pnlOverview.tradeCount} trades). Scanning alternative chains...`);

    for (const altChain of alternativeChains) {
      try {
        const [altPnl, altTokens, altTrades] = await Promise.all([
          withRetry(() => oc.getPortfolioOverview(address, altChain), `portfolio-overview-${altChain}`).catch(() => null),
          withRetry(() => oc.getTokenPnL(address, altChain), `token-pnl-${altChain}`).catch(() => []),
          withRetry(() => oc.getDexHistory(address, altChain, beginMs, endMs), `dex-history-${altChain}`).catch(() => []),
        ]);

        if (altPnl && altPnl.tradeCount > effectivePnlOverview.tradeCount) {
          strategySwitch = true;
          strategySwitchReason = `${primaryChain} had only ${effectivePnlOverview.tradeCount} trades, but ${altChain} has ${altPnl.tradeCount} — auto-switched analysis focus`;
          effectivePnlOverview = altPnl;
          effectiveTokenPnL = altTokens;
          effectiveTradeHistory = altTrades;
          effectiveDominantChain = altChain;
          console.log(`[Agent] Switched to ${altChain}: ${altPnl.tradeCount} trades, $${altPnl.totalPnlUsd.toLocaleString()} PnL`);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Estimate winRate from balance composition when OKX returns 0
  let pnlConfidence: DataConfidence = "confirmed";

  if (effectivePnlOverview.winRate === 0 && effectivePnlOverview.tradeCount === 0 && totalValue.totalUsd > 0) {
    pnlConfidence = "estimated";

    const allTokens = (balances?.chains || []).flatMap((c) => c?.tokens || []);
    const tv = totalValue.totalUsd || 1;
    const stableRatio = allTokens.filter(t => STABLE_PATTERNS.test(t.symbol)).reduce((s, t) => s + t.valueUsd, 0) / tv;
    const bluechipRatioVal = allTokens.filter(t => BLUECHIP_PATTERNS.test(t.symbol)).reduce((s, t) => s + t.valueUsd, 0) / tv;
    const memeRatioVal = allTokens.filter(t => MEME_PATTERNS.test(t.symbol)).reduce((s, t) => s + t.valueUsd, 0) / tv;

    let estimatedWinRate = 0.45;
    estimatedWinRate += bluechipRatioVal * 0.15;
    estimatedWinRate += stableRatio * 0.05;
    estimatedWinRate -= memeRatioVal * 0.20;
    estimatedWinRate = Math.max(0.15, Math.min(0.70, estimatedWinRate));
    effectivePnlOverview.winRate = Math.round(estimatedWinRate * 100) / 100;

    const nonNativeCount = allTokens.filter(t => !/^(eth|btc|bnb|sol)$/i.test(t.symbol)).length;
    effectivePnlOverview.tradeCount = Math.max(effectivePnlOverview.tradeCount, nonNativeCount * 2);
  }

  // Phase 3: Extract behavioral profile
  const behavioralProfile = extractBehavioralProfile(
    { tokenPnL: effectiveTokenPnL, tradeHistory: effectiveTradeHistory, balances, totalValue },
    effectivePnlOverview,
  );

  // Override dominant chain if strategy switched
  if (strategySwitch) {
    behavioralProfile.dominantChain = effectiveDominantChain;
    behavioralProfile.dominantChainReason = `Auto-switched: ${strategySwitchReason}`;
  }

  return {
    totalValue,
    balances,
    pnlOverview: effectivePnlOverview,
    tokenPnL: effectiveTokenPnL,
    tradeHistory: effectiveTradeHistory,
    behavioralProfile,
    pnlConfidence,
    scanMeta: {
      chainsScanned: chains,
      dominantChain: behavioralProfile.dominantChain,
      dominantChainReason: behavioralProfile.dominantChainReason,
      strategySwitch,
      strategySwitchReason,
    },
  };
}
