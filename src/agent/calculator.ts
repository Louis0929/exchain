import type { CompensationParams, CompensationResult } from "../types/exchain.js";

export function calculateCompensation(params: CompensationParams): CompensationResult {
  const {
    totalAssetsUsd,
    realizedPnlUsd,
    winRate,
    baseRate = 0.05,
    profitShareRate = 0.10,
    emotionalMultiplier = true,
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
  const total = baseCompensation + profitShare + emotionalDamages;

  const roundedBase = Math.round(baseCompensation * 100) / 100;
  const roundedProfit = Math.round(profitShare * 100) / 100;
  const roundedEmotional = Math.round(emotionalDamages * 100) / 100;
  const roundedTotal = Math.round((roundedBase + roundedProfit + roundedEmotional) * 100) / 100;

  return {
    baseCompensation: roundedBase,
    profitShare: roundedProfit,
    emotionalDamages: roundedEmotional,
    emotionalMultiplier: emotionalMultiplierValue,
    total: roundedTotal,
    currency: "USD",
    breakdown: [
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
    ],
  };
}
