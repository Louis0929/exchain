import type { CompensationParams, CompensationResult, BehavioralProfile } from "../types/exchain.js";

function calculateDegenPenalty(profile: BehavioralProfile): { multiplier: number; reason: string } {
  // If the ex is a degen who lost money on memes/rugs, they owe more — they wasted shared resources
  // If the ex is a degen who made money through risky behavior, they owe more — hidden profits
  const { degenScore, rugPullCount, memeTradeFrequency, highRiskTradeCount, avgSlippageLoss } = profile;

  if (degenScore < 20) {
    return { multiplier: 1.0, reason: "交易行為穩健，無額外調整" };
  }

  let penalty = 0;

  // Rug pull victims wasted relationship money on scams
  if (rugPullCount > 0) {
    penalty += rugPullCount * 0.05; // +5% per rug pull
  }

  // High meme frequency = gambling with shared future
  if (memeTradeFrequency > 0.3) {
    penalty += 0.10; // +10% for heavy meme gambling
  } else if (memeTradeFrequency > 0.1) {
    penalty += 0.05;
  }

  // High slippage = poor financial judgment
  if (avgSlippageLoss > 20) {
    penalty += 0.08;
  } else if (avgSlippageLoss > 10) {
    penalty += 0.04;
  }

  // High risk trades = irresponsible with shared assets
  if (highRiskTradeCount >= 5) {
    penalty += 0.10;
  } else if (highRiskTradeCount >= 2) {
    penalty += 0.05;
  }

  // Cap the penalty at 30%
  penalty = Math.min(penalty, 0.30);

  if (penalty <= 0) {
    return { multiplier: 1.0, reason: "高活躍度但風控尚可，無額外調整" };
  }

  const reasons: string[] = [];
  if (rugPullCount > 0) reasons.push(`被 Rug ${rugPullCount} 次`);
  if (memeTradeFrequency > 0.1) reasons.push(`Meme 幣佔比 ${(memeTradeFrequency * 100).toFixed(0)}%`);
  if (avgSlippageLoss > 10) reasons.push(`平均滑點損失 ${avgSlippageLoss.toFixed(1)}%`);
  if (highRiskTradeCount >= 2) reasons.push(`高風險交易 ${highRiskTradeCount} 筆`);

  return {
    multiplier: 1 + penalty,
    reason: `${reasons.join("、")}，補償金提高 ${(penalty * 100).toFixed(0)}%`,
  };
}

export function calculateCompensation(params: CompensationParams): CompensationResult {
  const {
    totalAssetsUsd,
    realizedPnlUsd,
    winRate,
    baseRate = 0.05,
    profitShareRate = 0.10,
    emotionalMultiplier = true,
    behavioralProfile,
  } = params;

  const baseCompensation = totalAssetsUsd * baseRate;
  const profitShare = realizedPnlUsd * profitShareRate;

  let emotionalMultiplierValue = 1.0;
  let emotionalReason = "";

  if (emotionalMultiplier) {
    if (winRate > 0.7) {
      emotionalMultiplierValue = 1.5;
      emotionalReason = "他贏麻了還裝窮，加收 50%";
    } else if (winRate < 0.3) {
      emotionalMultiplierValue = 0.5;
      emotionalReason = "他也很慘，減免 50%";
    } else {
      emotionalMultiplierValue = 1.0;
      emotionalReason = "勝率正常，標準計算";
    }
  }

  const emotionalDamages = (baseCompensation + profitShare) * (emotionalMultiplierValue - 1);

  // Degen penalty — based on behavioral profile
  let degenPenalty = 0;
  let degenMultiplier = 1.0;
  let degenReason = "無數據";

  if (behavioralProfile) {
    const penalty = calculateDegenPenalty(behavioralProfile);
    degenMultiplier = penalty.multiplier;
    degenReason = penalty.reason;
    degenPenalty = (baseCompensation + profitShare) * (degenMultiplier - 1);
  }

  const total = baseCompensation + profitShare + emotionalDamages + degenPenalty;

  const roundedBase = Math.round(baseCompensation * 100) / 100;
  const roundedProfit = Math.round(profitShare * 100) / 100;
  const roundedEmotional = Math.round(emotionalDamages * 100) / 100;
  const roundedDegen = Math.round(degenPenalty * 100) / 100;
  const roundedTotal = Math.round((roundedBase + roundedProfit + roundedEmotional + roundedDegen) * 100) / 100;

  const breakdown = [
    {
      label: "基礎補償",
      amount: roundedBase,
      detail: `前任總資產 $${(totalAssetsUsd || 0).toLocaleString()} × ${(baseRate * 100).toFixed(0)}%`,
    },
    {
      label: "關係期間收益分成",
      amount: roundedProfit,
      detail: `已實現盈虧 $${(realizedPnlUsd || 0).toLocaleString()} × ${(profitShareRate * 100).toFixed(0)}%`,
    },
    {
      label: "精神損失費",
      amount: roundedEmotional,
      detail: emotionalReason || "未啟用",
    },
  ];

  if (roundedDegen > 0) {
    breakdown.push({
      label: "韭菜行為加罰",
      amount: roundedDegen,
      detail: degenReason,
    });
  }

  return {
    baseCompensation: roundedBase,
    profitShare: roundedProfit,
    emotionalDamages: roundedEmotional,
    degenPenalty: roundedDegen,
    emotionalMultiplier: emotionalMultiplierValue,
    degenMultiplier,
    total: roundedTotal,
    currency: "USD",
    breakdown,
  };
}
