import { useEffect, useState, useRef } from "react";
import type { BreakupReport } from "../lib/types";

interface Props {
  report: BreakupReport;
}

function AnimatedNumber({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1200;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span
      className="text-exgold font-cyber font-black text-2xl md:text-3xl"
      style={{ textShadow: "0 0 12px rgba(255,215,0,0.5), 0 0 24px rgba(255,215,0,0.3)" }}
    >
      {prefix}{Math.round(display).toLocaleString()}
    </span>
  );
}

export default function CompensationCard({ report }: Props) {
  const { compensation, roast, caseNumber, exAddress } = report;
  const [visibleItems, setVisibleItems] = useState(0);
  const [showCoins, setShowCoins] = useState(false);
  const [summonsState, setSummonsState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [summonsError, setSummonsError] = useState("");

  useEffect(() => {
    const timers = compensation.breakdown.map((_, i) =>
      setTimeout(() => setVisibleItems(i + 1), (i + 1) * 600)
    );
    setTimeout(() => setShowCoins(compensation.total > 5000), compensation.breakdown.length * 600 + 500);
    return () => timers.forEach(clearTimeout);
  }, [compensation]);

  const handleSummons = async () => {
    setSummonsState("sending");
    setSummonsError("");
    try {
      const res = await fetch("/api/summons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: exAddress,
          amount: "0.01",
          chain: "base",
          caseNumber,
          compensationTotal: compensation.total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "發送失敗");
      setSummonsState("sent");
    } catch (err: any) {
      setSummonsError(err.message);
      setSummonsState("error");
    }
  };

  return (
    <div
      className="cyber-card neon-glow-cyan bg-excard/90 backdrop-blur-sm p-6 md:p-8 animate-slide-up relative overflow-hidden"
      style={{ animationDelay: "0.3s" }}
    >
      {/* Coin rain */}
      {showCoins && (
        <div className="coin-rain absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="coin"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: "-20px",
                animationDelay: `${i * 0.2}s`,
              }}
            >
              ◆
            </span>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="font-cyber text-2xl mb-1 text-excyan animate-text-glow">⚖</div>
        <h2 className="text-lg font-cyber font-bold text-white tracking-wider">COMPENSATION NOTICE</h2>
        <div className="font-mono text-xs text-exmuted tracking-[0.3em]">CASE #{caseNumber}</div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        {compensation.breakdown.map((item, i) => (
          <div
            key={i}
            className={`transition-all duration-500 ${
              i < visibleItems ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-sm text-gray-300">{item.label}</span>
              <span
                className={`font-bold font-mono text-sm ${item.amount >= 0 ? "text-exgold" : "text-exred"}`}
                style={{ textShadow: item.amount >= 0 ? "0 0 8px rgba(255,215,0,0.4)" : "0 0 8px rgba(255,45,85,0.4)" }}
              >
                {item.amount >= 0 ? "+" : ""}${Math.abs(Math.round(item.amount)).toLocaleString()}
              </span>
            </div>
            <div className="font-mono text-xs text-exmuted mt-0.5">{item.detail}</div>
            <div className="border-t border-gray-800/50 mt-2" />
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="text-center py-4 border-t-2 border-b-2 border-excyan/20 mb-4">
        <div className="font-mono text-sm text-exmuted mb-1 tracking-wider">TOTAL COMPENSATION</div>
        {compensation.total > 0 ? (
          <AnimatedNumber value={compensation.total} />
        ) : (
          <div>
            <div className="text-exmuted font-mono text-lg">$0</div>
            <div className="font-mono text-sm text-exmuted mt-1">BROKE BEYOND COMPENSATION</div>
          </div>
        )}
        <div className="font-mono text-xs text-exmuted mt-1 tracking-wider">RECOMMENDED: USDC / USDT</div>
      </div>

      {/* On-chain Summons Button */}
      <div className="mb-4">
        {summonsState === "idle" && (
          <button
            onClick={handleSummons}
            className="w-full py-3 bg-gradient-to-r from-exred via-exmagenta to-expurple text-white font-cyber font-bold text-sm tracking-widest hover:brightness-110 transition-all cyber-card"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.3)" }}
          >
            ⚔ ON-CHAIN SUMMONS
          </button>
        )}
        {summonsState === "sending" && (
          <button disabled className="w-full py-3 bg-gray-800 text-gray-500 font-mono text-sm tracking-wider cyber-card animate-pulse">
            TRANSMITTING...
          </button>
        )}
        {summonsState === "sent" && (
          <div className="w-full py-3 bg-exneon/10 border border-exneon/30 text-exneon font-mono text-sm text-center cyber-card" style={{ textShadow: "0 0 8px rgba(57,255,20,0.4)" }}>
            ◆ SUMMONS DELIVERED // 0.01 USDC SENT
          </div>
        )}
        {summonsState === "error" && (
          <div className="space-y-2">
            <div className="w-full py-3 bg-exred/10 border border-exred/30 text-exred font-mono text-sm text-center cyber-card">
              ✕ {summonsError}
            </div>
            <button
              onClick={() => setSummonsState("idle")}
              className="w-full py-2 bg-gray-900 text-exmuted font-mono text-xs tracking-wider hover:text-excyan transition border border-gray-800"
            >
              [ RETRY ]
            </button>
          </div>
        )}
        <div className="font-mono text-xs text-exmuted text-center mt-2 tracking-wider">
          SEND 0.01 USDC (BASE) AS ON-CHAIN PROOF
        </div>
      </div>

      {/* AI Roast */}
      <div className="bg-black/40 border border-exmagenta/20 p-4 cyber-card">
        <div className="font-mono text-xs text-exmagenta mb-2 tracking-wider" style={{ textShadow: "0 0 6px rgba(255,0,255,0.4)" }}>
          ◈ AI JUDGE VERDICT
        </div>
        <p className="font-mono text-sm text-gray-200 italic leading-relaxed">&ldquo;{roast}&rdquo;</p>
      </div>

      <div className="text-center font-mono text-xs text-exmuted mt-4 tracking-wider">
        * ENTERTAINMENT ONLY // NOT LEGAL ADVICE
      </div>
    </div>
  );
}
