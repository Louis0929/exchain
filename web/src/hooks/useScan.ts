import { useState, useCallback } from "react";
import type { BreakupReport, ScanRequest } from "../lib/types";
import { scanWallet } from "../lib/api";

type ScanState = "idle" | "loading" | "done" | "error";

export function useScan() {
  const [state, setState] = useState<ScanState>("idle");
  const [report, setReport] = useState<BreakupReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (req: ScanRequest) => {
    setState("loading");
    setError(null);
    setReport(null);
    try {
      const data = await scanWallet(req);
      setReport(data.report);
      setState("done");
    } catch (e: any) {
      setError(e.message || "Unknown error");
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setReport(null);
    setError(null);
  }, []);

  return { state, report, error, scan, reset };
}
