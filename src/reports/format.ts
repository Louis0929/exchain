import type { BreakupReport } from "../types/exchain.js";
import { INVESTMENT_TAG_LABELS } from "../types/exchain.js";

export function formatScanReport(report: BreakupReport): string {
  const lines: string[] = [];
  const c = report.compensation;

  lines.push("╔═══════════════════════════════════════════════════════════╗");
  lines.push("║                    💀 WANTED 💀                           ║");
  lines.push("║                                                           ║");
  lines.push(`║            ${maskAddress(report.exAddress)}                  ║`);
  lines.push("║          「前任通緝令」                                    ║");
  lines.push("║                                                           ║");
  lines.push("║  ┌─────────────────────────────────────────────────────┐  ║");
  lines.push("║  │                                                     │  ║");
  lines.push(`║  │    💰 鏈上資產        📊 交易勝率      🏷️ 人設標籤   │  ║`);
  lines.push("║  │                                                     │  ║");
  lines.push(`║  │    $${(report.walletData.totalAssetsUsd || 0).toLocaleString().padEnd(12)} ${(Math.round(report.walletData.winRate * 100) + "%").padEnd(14)} ${report.scores.investmentTags.map((t) => INVESTMENT_TAG_LABELS[t]).join(" ").padEnd(14)}│  ║`);
  lines.push("║  │                                                     │  ║");
  lines.push("║  └─────────────────────────────────────────────────────┘  ║");
  lines.push("║                                                           ║");

  // Earning index bar
  const barLen = 30;
  const filled = Math.round((report.scores.earningIndex.score / 100) * barLen);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
  lines.push("║  ┌─── 賺錢指數 ───────────────────────────────────────┐  ║");
  lines.push("║  │                                                     │  ║");
  lines.push(`║  │   ${bar}  ${report.scores.earningIndex.score}/100               │  ║`);
  lines.push("║  │                              被矇在鼓裏的區域 →     │  ║");
  lines.push("║  │                                                     │  ║");
  lines.push("║  └─────────────────────────────────────────────────────┘  ║");
  lines.push("║                                                           ║");

  // Lie index
  const lieFilled = Math.round((report.scores.lieIndex / 100) * barLen);
  const lieBar = "█".repeat(lieFilled) + "░".repeat(barLen - lieFilled);
  lines.push(`║  🕵️ 說謊指數: ${lieBar} ${report.scores.lieIndex}%                             ║`);
  if (report.scores.lieIndex > 50) {
    lines.push(`║     "他說沒錢，但鏈上資產 $${report.walletData.totalAssetsUsd.toLocaleString()}+"                          ║`);
  }
  lines.push("║                                                           ║");
  lines.push("╚═══════════════════════════════════════════════════════════╝");
  lines.push("");

  // Compensation section
  if (c.total > 0) {
    lines.push("╔═══════════════════════════════════════════════════════════╗");
    lines.push("║                                                           ║");
    lines.push("║          ⚖️ 分手補償通知書 ⚖️                             ║");
    lines.push(`║          Case #${report.caseNumber}                               ║`);
    lines.push("║                                                           ║");
    lines.push("║  ───────────────────────────────────────────────────────  ║");

    for (const item of c.breakdown) {
      lines.push("║                                                           ║");
      lines.push(`║  ${item.label}：${item.detail.padEnd(38)} ║`);
      lines.push(`║  ───────────────────────────────── $${item.amount.toLocaleString().padStart(10)}             ║`);
    }

    lines.push("║                                                           ║");
    lines.push("║  ═══════════════════════════════════════════════════════  ║");
    lines.push("║                                                           ║");
    lines.push(`║        💸 判定補償金：$${c.total.toLocaleString()} USD                          ║`);
    lines.push("║        建議支付：USDC / USDT                              ║");
    lines.push("║                                                           ║");
    lines.push("║  ═══════════════════════════════════════════════════════  ║");
    lines.push("║                                                           ║");
    lines.push("║  🤖 法官 AI 感言：                                        ║");
    lines.push("║  ┌─────────────────────────────────────────────────────┐  ║");
    lines.push(`║  │  ${report.roast.padEnd(52)}│  ║`);
    lines.push("║  └─────────────────────────────────────────────────────┘  ║");
    lines.push("║                                                           ║");
    lines.push("║  * 本通知書純屬娛樂，不構成法律建議                        ║");
    lines.push("║                                                           ║");
    lines.push("╚═══════════════════════════════════════════════════════════╝");
  } else {
    lines.push("💀 補償金：$0");
    lines.push("🍜 「窮到連補償金都算不出」配一碗泡麵");
  }

  lines.push("");
  lines.push("[📤 分享到 Twitter]  [📸 生成圖片]  [📨 發送鏈上存證]  [🔗 建立 ExChain Lock]");
  lines.push("");
  lines.push("💡 使用 'exchain summons <address>' 發送鏈上存證到對方錢包");
  lines.push("💡 使用 'exchain refresh <address>' 實時刷新對方錢包數據");
  lines.push("");
  lines.push("* 純屬娛樂，數據來自公開區塊鏈");

  return lines.join("\n");
}

function maskAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
