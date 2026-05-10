import type { WalletScores, CompensationResult, BehavioralProfile, DataConfidence } from "../types/exchain.js";
import { INVESTMENT_TAG_LABELS } from "../types/exchain.js";

interface RoastInput {
  scores: WalletScores;
  compensation: CompensationResult;
  totalAssetsUsd: number;
  winRate: number;
  winRateConfidence?: DataConfidence;
  exAddress: string;
  selfScan: boolean;
}

function buildDataDrivenRoast(input: RoastInput): string {
  const { scores, compensation, totalAssetsUsd, winRate, winRateConfidence } = input;
  const profile = scores.behavioralProfile;
  const parts: string[] = [];
  const winRateTag = winRateConfidence === "estimated" ? "（估算）" : "";

  // --- Opening: verdict based on lie index + assets ---
  if (totalAssetsUsd > 100_000) {
    parts.push(`你的前任錢包裡躺著 $${totalAssetsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}，說謊指數 ${scores.lieIndex}%。他說「最近手頭緊」的時候，區塊鏈顯示他剛入帳五位數。`);
  } else if (totalAssetsUsd > 10_000) {
    parts.push(`你的前任錢包有 $${totalAssetsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}，說謊指數 ${scores.lieIndex}%。「沒錢」這個藉口在鏈上不成立。`);
  } else if (totalAssetsUsd <= 0) {
    return `你的前任是 true degen，錢包比心還空。補償金：$0。窮到連補償金都算不出 🍜。區塊鏈的透明性讓我們看到殘酷的真相——他真的沒有錢，但也真的沒有用心。`;
  } else {
    parts.push(`你的前任錢包只剩 $${totalAssetsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}，說謊指數 ${scores.lieIndex}%。不多，但至少鏈上數據誠實。`);
  }

  // --- Behavioral evidence ---
  if (profile) {
    const evidence: string[] = [];

    // DEX-based evidence (confirmed data)
    if (profile.dataSource === "dex_history") {
      if (profile.avgSlippageLoss > 15) {
        evidence.push(`DEX 交易平均滑點損失 ${profile.avgSlippageLoss.toFixed(1)}%，這種交易水平證明他的判斷力在投資和感情上一樣糟糕`);
      } else if (profile.avgSlippageLoss > 5) {
        evidence.push(`平均滑點損失 ${profile.avgSlippageLoss.toFixed(1)}%，交易執行能力一般，跟他的承諾一樣靠不住`);
      }

      if (profile.memeTradeFrequency > 0.3) {
        evidence.push(`${(profile.memeTradeFrequency * 100).toFixed(0)}% 的交易都是 Meme 幣，他寧願相信 DOGE 能上月球，也不願相信你能陪他走下去`);
      } else if (profile.memeTradeFrequency > 0.1) {
        evidence.push(`Meme 幣交易佔比 ${(profile.memeTradeFrequency * 100).toFixed(0)}%，把感情當賭博的不只是錢包`);
      }

      if (profile.rugPullCount > 0) {
        evidence.push(`被 Rug Pull 了 ${profile.rugPullCount} 次，連詐騙集團都選擇了他——就像你選擇了他一樣，都是錯付`);
      }

      if (profile.highRiskTradeCount >= 5) {
        evidence.push(`${profile.highRiskTradeCount} 筆高風險交易全部虧損，這種人不只是韭菜，是韭菜中的韭菜，建議補償金提高 ${Math.round((compensation.degenMultiplier - 1) * 100)}%`);
      } else if (profile.highRiskTradeCount >= 2) {
        evidence.push(`${profile.highRiskTradeCount} 筆高風險交易虧損，他對風險的管理跟對你的承諾一樣——形同虛設`);
      }

      if (profile.degenScore >= 60) {
        evidence.push(`Degen 指數 ${profile.degenScore}/100——他把你們的未來都梭哈在了 Meme 幣上`);
      } else if (profile.degenScore >= 30) {
        evidence.push(`Degen 指數 ${profile.degenScore}/100，不算離譜但也不靠譜，就像他這個人`);
      }
    }

    // Balance-derived evidence (estimated data)
    if (profile.dataSource === "balances" && profile.balanceDerivedMetrics && evidence.length === 0) {
      const bdm = profile.balanceDerivedMetrics;

      if (bdm.memeTokenRatio > 0.3) {
        evidence.push(`錢包裡 ${(bdm.memeTokenRatio * 100).toFixed(0)}% 都是 Meme 幣（${bdm.memeTokenCount} 種），他寧願相信 PEPE 能上月球，也不願相信你能陪他走下去`);
      } else if (bdm.memeTokenRatio > 0.1) {
        evidence.push(`持倉有 ${(bdm.memeTokenRatio * 100).toFixed(0)}% 是 Meme 幣，把感情當賭博的不只是錢包`);
      }

      if (bdm.stablecoinRatio > 0.7) {
        evidence.push(`持倉 ${(bdm.stablecoinRatio * 100).toFixed(0)}% 是穩定幣——錢全跑了，人也不會留`);
      } else if (bdm.stablecoinRatio < 0.05 && bdm.bluechipRatio < 0.3) {
        evidence.push(`幾乎沒有穩定幣和藍籌資產，他的風控和對你的承諾一樣——形同虛設`);
      }

      if (bdm.concentrationRisk > 70 && bdm.bluechipRatio < 0.2) {
        evidence.push(`持倉高度集中在 ${bdm.topTokenSymbol}（佔比 ${(bdm.topTokenRatio * 100).toFixed(0)}%），梭哈心態暴露無遺`);
      }

      if (bdm.tokenCount > 20) {
        evidence.push(`持有 ${bdm.tokenCount} 種不同的代幣，投資和感情一樣沒有重點`);
      } else if (bdm.tokenCount === 1 && bdm.memeTokenCount === 1) {
        evidence.push(`錢包裡只有一個 Meme 幣，這不是投資，這是信仰——可惜他信錯了幣也信錯了人`);
      }

      if (bdm.bluechipRatio > 0.5) {
        evidence.push(`藍籌資產佔比 ${(bdm.bluechipRatio * 100).toFixed(0)}%，至少投資上有判斷力——可惜感情上沒有`);
      }
    }

    if (evidence.length > 0) {
      const source = profile.dataSource === "balances" ? "鏈上持倉證據（基於持倉分析）" : "鏈上證據";
      parts.push(source + "：" + evidence.join("；") + "。");
    }

    // --- Degen score summary (show even with estimated data) ---
    if (profile.degenScore >= 60 && profile.dataSource === "balances") {
      parts.push(`Degen 指數 ${profile.degenScore}/100（基於持倉估算）——他把你們的未來都梭哈在了高風險資產上`);
    }
  }

  // --- Win rate verdict ---
  if (winRate > 0.7) {
    parts.push(`勝率 ${Math.round(winRate * 100)}%${winRateTag}，穩定盈利。他在 K 線上賺的每一分錢，都有你陪伴的影子。補償金是他欠你的分紅。`);
  } else if (winRate < 0.3 && totalAssetsUsd > 0) {
    parts.push(`勝率只有 ${Math.round(winRate * 100)}%${winRateTag}，他在鏈上比在感情裡還不靠譜。分手是正確的止損操作。`);
  }

  // --- Chain strategy switch ---
  if (scores.behavioralProfile?.dominantChain && scores.behavioralProfile.dominantChain !== "ethereum") {
    parts.push(`Agent 偵測到他的主要活動在 ${scores.behavioralProfile.dominantChain} 鏈上，已自動切換分析策略。他想藏，但 ExChain 找到了。`);
  }

  // --- Compensation verdict ---
  if (compensation.total > 0) {
    const degenNote = compensation.degenPenalty > 0
      ? `（含韭菜行為加罰 $${compensation.degenPenalty.toLocaleString()}）`
      : "";
    parts.push(`判定補償金：$${compensation.total.toLocaleString()} ${degenNote}。建議用 ExChain 鏈上存證發送，讓這筆帳上鏈，不可篡改。`);
  }

  return parts.join(" ");
}

export function generateRoast(input: RoastInput): string {
  if (input.selfScan) {
    return "掃描自己？你是不是沒有前任 😢 也許你需要的不是 ExChain，而是一個用 ExChain Lock 鎖定的下一任。";
  }

  if (input.totalAssetsUsd <= 0) {
    return `你的前任是 true degen，錢包比心還空。補償金：$0。窮到連補償金都算不出 🍜。區塊鏈的透明性讓我們看到殘酷的真相——他真的沒有錢，但也真的沒有用心。`;
  }

  return buildDataDrivenRoast(input);
}

export function generateCaseNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `EX-${y}-${m}${d}-${seq}`;
}
