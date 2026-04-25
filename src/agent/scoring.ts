import type { WalletScores, InvestmentTag, EarningScore } from "../types/exchain.js";
import type { ScanResult } from "./scanner.js";
import { INVESTMENT_TAG_LABELS } from "../types/exchain.js";
import { getSmartMoneyLeaderboard } from "../utils/onchainos.js";

export function calculateEarningIndex(totalAssetsUsd: number): EarningScore {
  if (totalAssetsUsd <= 0) {
    return { score: 0, label: "窮到連補償金都算不出", totalAssetsUsd };
  }

  let score: number;
  let label: string;

  if (totalAssetsUsd < 100) {
    score = 5; label = "🦐 小蝦米";
  } else if (totalAssetsUsd < 1_000) {
    score = 15; label = "🦐 小蝦米";
  } else if (totalAssetsUsd < 10_000) {
    score = 30; label = "小魚";
  } else if (totalAssetsUsd < 50_000) {
    score = 50; label = "中度玩家";
  } else if (totalAssetsUsd < 100_000) {
    score = 70; label = "🐋 小鯨魚";
  } else if (totalAssetsUsd < 1_000_000) {
    score = 85; label = "🐋 鯨魚";
  } else {
    score = 100; label = "🐋 巨鯨";
  }

  return { score, label, totalAssetsUsd };
}

export function classifyInvestmentStyle(scanResult: ScanResult): InvestmentTag[] {
  const tags: InvestmentTag[] = [];
  const { tokenPnL, pnlOverview, balances } = scanResult;

  // Check holdings for style classification
  const allTokens = (balances?.chains || []).flatMap((c) => c?.tokens || []);
  const hasNft = false; // Would need NFT-specific API
  const memeTokens = allTokens.filter((t) =>
    /doge|pepe|shib|floki|wojak|bonk|meme/i.test(t.symbol)
  );
  const defiTokens = allTokens.filter((t) =>
    /aave|comp|uni|crv|mkr|ldo|rpl|sushi/i.test(t.symbol)
  );
  const stablePct = allTokens.reduce(
    (sum, t) => /usdc|usdt|dai|busd/i.test(t.symbol) ? sum + t.valueUsd : sum,
    0
  );
  const totalValue = scanResult.totalValue.totalUsd || 1;

  if (memeTokens.length >= 3 || (memeTokens.reduce((s, t) => s + t.valueUsd, 0) / totalValue) > 0.3) {
    tags.push("meme_player");
  }
  if (defiTokens.length >= 2) {
    tags.push("defi_farmer");
  }
  if (stablePct / totalValue > 0.7) {
    tags.push("paper_hands");
  }

  // PnL-based tags
  if (pnlOverview.winRate >= 0.6 && pnlOverview.tradeCount >= 10) {
    tags.push("diamond_hands");
  }
  if (pnlOverview.winRate < 0.35 && pnlOverview.tradeCount >= 5) {
    tags.push("paper_hands");
  }

  // Whale/shrimp based on total
  if (scanResult.totalValue.totalUsd >= 100_000) {
    tags.push("whale");
  } else if (scanResult.totalValue.totalUsd < 1_000) {
    tags.push("shrimp");
  }

  // Default: if no specific tags
  if (tags.length === 0) {
    tags.push("trend_trader");
  }

  return [...new Set(tags)];
}

export function calculateLieIndex(
  totalAssetsUsd: number,
  claimedBroke: boolean = true
): number {
  if (!claimedBroke) return 0;
  if (totalAssetsUsd <= 0) return 0;
  if (totalAssetsUsd >= 100_000) return 95;
  if (totalAssetsUsd >= 50_000) return 85;
  if (totalAssetsUsd >= 10_000) return 70;
  if (totalAssetsUsd >= 5_000) return 50;
  if (totalAssetsUsd >= 1_000) return 30;
  return 10;
}

export async function getSmartMoneyRank(address: string): Promise<number | null> {
  try {
    const leaderboard = await getSmartMoneyLeaderboard();
    const entry = leaderboard.find((e) => e.address.toLowerCase() === address.toLowerCase());
    return entry ? entry.rank : null;
  } catch {
    return null;
  }
}

export function getActivityLevel(tradeCount: number): "gym_rat" | "chill" {
  return tradeCount >= 50 ? "gym_rat" : "chill";
}

export function getRiskLevel(winRate: number, totalTrades: number): WalletScores["riskLevel"] {
  if (winRate < 0.3 && totalTrades > 20) return "degen";
  if (winRate < 0.4) return "aggressive";
  if (winRate < 0.6) return "moderate";
  return "conservative";
}

export function scoreWallet(scanResult: ScanResult): WalletScores {
  const earningIndex = calculateEarningIndex(scanResult.totalValue.totalUsd);
  const investmentTags = classifyInvestmentStyle(scanResult);
  const lieIndex = calculateLieIndex(scanResult.totalValue.totalUsd);
  const activityLevel = getActivityLevel(scanResult.pnlOverview.tradeCount);
  const riskLevel = getRiskLevel(
    scanResult.pnlOverview.winRate,
    scanResult.pnlOverview.tradeCount
  );

  return { earningIndex, investmentTags, lieIndex, activityLevel, riskLevel };
}
