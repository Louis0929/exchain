import type { BreakupReport, ScanRequest } from "../lib/types";
import { INVESTMENT_TAG_LABELS } from "../lib/types";

interface Props {
  report: BreakupReport;
  originalRequest: ScanRequest;
  onRefresh: (req: ScanRequest) => void;
  isRefreshing: boolean;
}

function maskAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function IndexBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between font-mono text-xs mb-1 tracking-wider">
        <span className="text-exmuted">{label}</span>
        <span className="font-bold" style={{ color, textShadow: `0 0 8px ${color}` }}>{value}%</span>
      </div>
      <div className="w-full bg-gray-900 h-2 overflow-hidden relative">
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </div>
  );
}

export default function WantedPoster({ report, originalRequest, onRefresh, isRefreshing }: Props) {
  const { earningIndex, investmentTags, lieIndex } = report.scores;
  const { totalAssetsUsd, winRate } = report.walletData;

  return (
    <div className="cyber-card neon-glow-red bg-excard/90 backdrop-blur-sm p-6 md:p-8 animate-slide-up">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="font-cyber text-3xl mb-1 holo-text font-black tracking-widest">WANTED</div>
        <div className="font-mono text-excyan text-sm tracking-[0.3em] mb-1 animate-text-glow">
          {maskAddress(report.exAddress)}
        </div>
        <div className="font-mono text-exmuted text-xs tracking-wider">[ 前任通緝令 ]</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-black/40 border border-gray-800 p-3 text-center cyber-card">
          <div className="font-mono text-xs text-exmuted mb-1 tracking-wider">ON-CHAIN</div>
          <div className="text-exgold font-bold text-sm md:text-base font-mono" style={{ textShadow: "0 0 8px rgba(255,215,0,0.4)" }}>{formatUsd(totalAssetsUsd)}</div>
        </div>
        <div className="bg-black/40 border border-gray-800 p-3 text-center cyber-card">
          <div className="font-mono text-xs text-exmuted mb-1 tracking-wider">WIN RATE</div>
          <div className="text-excyan font-bold text-sm md:text-base font-mono" style={{ textShadow: "0 0 8px rgba(0,240,255,0.4)" }}>{Math.round(winRate * 100)}%</div>
        </div>
        <div className="bg-black/40 border border-gray-800 p-3 text-center cyber-card">
          <div className="font-mono text-xs text-exmuted mb-1 tracking-wider">TAGS</div>
          <div className="font-bold text-sm md:text-base">
            {investmentTags.map((t) => INVESTMENT_TAG_LABELS[t]).join(" ")}
          </div>
        </div>
      </div>

      {/* Index bars */}
      <div className="bg-black/30 border border-gray-800/50 p-4 mb-3 cyber-card">
        <IndexBar value={earningIndex.score} color="#00f0ff" label="賺錢指數 EARN" />
        <IndexBar value={lieIndex} color="#ff2d55" label="說謊指數 LIE" />
        {lieIndex > 50 && (
          <p className="font-mono text-xs text-exred mt-2 tracking-wider" style={{ textShadow: "0 0 6px rgba(255,45,85,0.4)" }}>
            &quot;CLAIMED BROKE // ON-CHAIN ASSETS {formatUsd(totalAssetsUsd)}+&quot;
          </p>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={() => onRefresh(originalRequest)}
        disabled={isRefreshing}
        className={`w-full py-2.5 font-mono text-sm font-semibold tracking-wider transition-all cyber-card ${
          isRefreshing
            ? "bg-gray-900 text-gray-600 animate-pulse"
            : "bg-black/40 border border-gray-700 text-excyan hover:border-excyan hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
        }`}
      >
        {isRefreshing ? "⟳ SYNCING..." : "⟳ LIVE REFRESH"}
      </button>
    </div>
  );
}
