import { useState, useEffect } from "react";

const STEPS = [
  { icon: "✅", text: "WALLET BALANCE ACQUIRED", delay: 1500 },
  { icon: "✅", text: "HOLDINGS DECRYPTED", delay: 3500 },
  { icon: "⟳", text: "ANALYZING TRADE PATTERNS...", delay: 6000 },
  { icon: "⏳", text: "EMOTIONAL DAMAGE ASSESSMENT...", delay: 8500 },
  { icon: "⏳", text: "CALCULATING DECEPTION INDEX...", delay: 10000 },
];

const NOTES = [
  "TRACING ON-CHAIN TRANSFERS...",
  "SUSPICIOUS DEFI INTERACTIONS DETECTED...",
  "CROSS-REFERENCING NFT HISTORY...",
  "MATCHING WALLET TO SOCIAL GRAPH...",
  "QUANTIFYING EMOTIONAL DAMAGES...",
];

export default function ScanProgress() {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [progress, setProgress] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);

  useEffect(() => {
    const stepTimers = STEPS.map((step, i) =>
      setTimeout(() => setCompletedSteps(i + 1), step.delay)
    );
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 0.8, 88));
    }, 200);
    const noteTimer = setInterval(() => {
      setNoteIdx((n) => (n + 1) % NOTES.length);
    }, 2500);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearInterval(progressTimer);
      clearInterval(noteTimer);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 cyber-grid scanlines">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-flicker">⟐</div>
          <h2 className="text-xl font-cyber font-bold text-excyan tracking-widest animate-text-glow">
            SCANNING TARGET
          </h2>
        </div>

        <div className="w-full bg-excard border border-gray-800 h-3 mb-8 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-exred via-exmagenta to-excyan transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        </div>

        <div className="space-y-3 mb-8 font-mono text-sm">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-500 ${
                i < completedSteps ? "opacity-100 translate-x-0" : "opacity-20 translate-x-2"
              }`}
            >
              <span className="text-base">{i < completedSteps ? step.icon : "⏳"}</span>
              <span className={i < completedSteps ? "text-excyan" : "text-exmuted"}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center text-exmuted font-mono text-xs h-5 tracking-wider">
          <span className="text-exred">&gt;</span> {NOTES[noteIdx]}
        </div>
      </div>
    </div>
  );
}
