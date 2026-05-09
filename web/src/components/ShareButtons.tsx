import { useRef } from "react";
import { toPng } from "html-to-image";
import type { BreakupReport } from "../lib/types";

interface Props {
  report: BreakupReport;
  cardRef: React.RefObject<HTMLDivElement>;
}

export default function ShareButtons({ report, cardRef }: Props) {
  const handleTwitter = () => {
    const { totalAssetsUsd, winRate } = report.walletData;
    const text = encodeURIComponent(
      `💀 ExChain 前任通緝令\n💰 鏈上資產: $${totalAssetsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n📊 勝率: ${Math.round(winRate * 100)}%\n💸 補償金: $${Math.round(report.compensation.total).toLocaleString()}\n\n#ExChain #OnchainOS`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#050510",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `exchain-${report.caseNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Image export failed:", err);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={handleTwitter}
        className="flex items-center gap-2 px-6 py-2.5 border border-excyan text-excyan font-mono text-sm tracking-wider hover:bg-excyan hover:text-black transition-all cyber-card"
        style={{ textShadow: "0 0 6px rgba(0,240,255,0.3)" }}
      >
        ▶ SHARE
      </button>
      <button
        onClick={handleImage}
        className="flex items-center gap-2 px-6 py-2.5 border border-exmagenta text-exmagenta font-mono text-sm tracking-wider hover:bg-exmagenta hover:text-black transition-all cyber-card"
        style={{ textShadow: "0 0 6px rgba(255,0,255,0.3)" }}
      >
        ◈ EXPORT
      </button>
    </div>
  );
}
