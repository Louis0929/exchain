import { useRef, useState } from "react";
import { useScan } from "./hooks/useScan";
import LandingPage from "./components/LandingPage";
import ScanProgress from "./components/ScanProgress";
import WantedPoster from "./components/WantedPoster";
import CompensationCard from "./components/CompensationCard";
import ShareButtons from "./components/ShareButtons";
import type { ScanRequest, BreakupReport } from "./lib/types";

export default function App() {
  const { state, report, error, scan, reset } = useScan();
  const [originalRequest, setOriginalRequest] = useState<ScanRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveReport, setLiveReport] = useState<BreakupReport | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleScan = (req: ScanRequest) => {
    setOriginalRequest(req);
    scan(req);
  };

  const handleRefresh = async (req: ScanRequest) => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      setLiveReport(data.report);
    } catch {
      // Silent fail on refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayReport = liveReport || report;

  if (state === "loading") return <ScanProgress />;

  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 cyber-grid scanlines">
        <div className="text-5xl mb-4 animate-flicker">⚡</div>
        <p className="text-exred font-cyber text-lg mb-2 tracking-widest uppercase">SYSTEM ERROR</p>
        <p className="text-exmuted font-mono text-sm mb-6">{error}</p>
        <button onClick={reset} className="px-8 py-3 bg-excard border border-exred text-exred font-cyber text-sm tracking-wider hover:bg-exred hover:text-black transition-all">
          [ RETRY ]
        </button>
      </div>
    );
  }

  if (state === "done" && displayReport && originalRequest) {
    return (
      <div className="min-h-screen py-8 px-4 cyber-grid scanlines">
        <div className="max-w-lg mx-auto space-y-4">
          <div ref={cardRef} className="space-y-4">
            <WantedPoster
              report={displayReport}
              originalRequest={originalRequest}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
            <CompensationCard report={displayReport} />
          </div>
          <ShareButtons report={displayReport} cardRef={cardRef} />
          <div className="text-center mt-6">
            <button
              onClick={() => { reset(); setLiveReport(null); setOriginalRequest(null); }}
              className="text-exmuted font-mono text-xs hover:text-excyan transition tracking-wider"
            >
              &gt;&gt; SCAN ANOTHER TARGET &gt;&gt;
            </button>
          </div>
          <p className="text-center text-exmuted font-mono text-xs mt-4">
            * ENTERTAINMENT ONLY // DATA FROM PUBLIC BLOCKCHAIN
          </p>
        </div>
      </div>
    );
  }

  return <LandingPage onScan={handleScan} />;
}
