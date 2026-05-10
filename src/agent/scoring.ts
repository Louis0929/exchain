import type { WalletScores, InvestmentTag, EarningScore, BehavioralProfile, DataConfidence } from "../types/exchain.js";
import type { ScanResult } from "./scanner.js";
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
  const { pnlOverview, balances, behavioralProfile } = scanResult;

  const allTokens = (balances?.chains || []).flatMap((c) => c?.tokens || []);
  const memeTokens = allTokens.filter((t) =>
    /doge|pepe|shib|floki|wojak|bonk|meme|trump|fart|ponke|neiro|mog/i.test(t.symbol)
  );
  const defiTokens = allTokens.filter((t) =>
    /aave|comp|uni|crv|mkr|ldo|rpl|sushi/i.test(t.symbol)
  );
  const stablePct = allTokens.reduce(
    (sum, t) => /usdc|usdt|dai|busd/i.test(t.symbol) ? sum + t.valueUsd : sum,
    0
  );
  const totalValue = scanResult.totalValue.totalUsd || 1;

  // Behavioral profile tags (from DEX data)
  if (behavioralProfile.rugPullCount > 0) {
    tags.push("rug_pull_victim");
  }

  if (behavioralProfile.dataSource === "dex_history" && behavioralProfile.degenScore >= 60) {
    tags.push("degen");
  }

  // Balance-derived behavioral tags
  if (behavioralProfile.dataSource === "balances" && behavioralProfile.balanceDerivedMetrics) {
    const bdm = behavioralProfile.balanceDerivedMetrics;

    if (behavioralProfile.degenScore >= 60) {
      tags.push("degen");
    }

    if ((bdm.memeTokenRatio > 0.3 || bdm.memeTokenCount >= 3) && !tags.includes("meme_player")) {
      tags.push("meme_player");
    }

    if (bdm.concentrationRisk > 80 && bdm.bluechipRatio < 0.3 && !tags.includes("meme_player") && !tags.includes("trend_trader")) {
      tags.push("trend_trader");
    }
  }

  if (memeTokens.length >= 3 || (memeTokens.reduce((s, t) => s + t.valueUsd, 0) / totalValue) > 0.3) {
    if (!tags.includes("meme_player")) tags.push("meme_player");
  }
  if (defiTokens.length >= 2) {
    tags.push("defi_farmer");
  }
  if (stablePct / totalValue > 0.7) {
    if (!tags.includes("paper_hands")) tags.push("paper_hands");
  }

  // PnL-based tags
  if (pnlOverview.winRate >= 0.6 && pnlOverview.tradeCount >= 10) {
    tags.push("diamond_hands");
  }
  if (pnlOverview.winRate < 0.35 && pnlOverview.tradeCount >= 5) {
    if (!tags.includes("paper_hands")) tags.push("paper_hands");
  }

  // Whale/shrimp based on total
  if (scanResult.totalValue.totalUsd >= 100_000) {
    tags.push("whale");
  } else if (scanResult.totalValue.totalUsd < 1_000) {
    tags.push("shrimp");
  }

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

export function getRiskLevel(winRate: number, totalTrades: number, degenScore?: number, confidence?: DataConfidence): WalletScores["riskLevel"] {
  if (degenScore !== undefined && degenScore >= 70) return "degen";
  if (confidence === "estimated") {
    if (degenScore !== undefined && degenScore >= 80) return "degen";
    if (winRate < 0.3) return "aggressive";
    if (winRate < 0.45) return "moderate";
    return "moderate";
  }
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
    scanResult.pnlOverview.tradeCount,
    scanResult.behavioralProfile.degenScore,
    scanResult.pnlConfidence
  );

  return {
    earningIndex,
    investmentTags,
    lieIndex,
    activityLevel,
    riskLevel,
    behavioralProfile: scanResult.behavioralProfile,
  };
}
