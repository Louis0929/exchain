import { useState } from "react";
import type { ScanRequest } from "../lib/types";

interface Props {
  onScan: (req: ScanRequest) => void;
}

export default function LandingPage({ onScan }: Props) {
  const [address, setAddress] = useState("");
  const [from, setFrom] = useState("2023-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 7));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    onScan({
      address: address.trim(),
      relationshipStart: from ? `${from}-01` : undefined,
      relationshipEnd: to ? `${to}-28` : undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 cyber-grid scanlines">
      <div className="text-center mb-10 animate-slide-up">
        <h1
          className="text-6xl md:text-7xl font-black mb-3 font-cyber tracking-wider glitch-text"
          data-text="EXCHAIN"
        >
          <span className="text-exred">EX</span><span className="text-excyan">CHAIN</span>
        </h1>
        <p className="font-mono text-exmuted text-sm max-w-md mx-auto leading-relaxed">
          <span className="text-excyan">&gt;</span> Your ex said they&apos;re broke.<br />
          <span className="text-exred">&gt;</span> The blockchain disagrees.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="relative cyber-bracket" style={{ "--bracket-color": "#ff2d55" } as React.CSSProperties}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="輸入前任錢包地址 (0x... / bc1... / Solana)"
            className="w-full bg-excard border border-gray-800 rounded-none px-5 py-4 text-excyan placeholder:text-gray-700 focus:outline-none focus:border-exred transition-colors font-mono text-sm tracking-wider"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="font-mono text-xs text-exmuted mb-1 block tracking-wider">關係開始</label>
            <input
              type="month"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-excard border border-gray-800 rounded-none px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-excyan"
            />
          </div>
          <div className="flex-1">
            <label className="font-mono text-xs text-exmuted mb-1 block tracking-wider">分手日期</label>
            <input
              type="month"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-excard border border-gray-800 rounded-none px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-excyan"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!address.trim()}
          className="w-full py-4 bg-exred text-black font-cyber font-bold text-lg tracking-widest hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all animate-glow cyber-card"
        >
          ▶ 掃描前任
        </button>
      </form>

      <p className="font-mono text-exmuted text-xs mt-8 tracking-wider">
        <span className="text-exneon">4,207</span> TARGETS SCANNED &middot; ENTERTAINMENT ONLY
      </p>
    </div>
  );
}
