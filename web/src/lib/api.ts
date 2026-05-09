import type { ScanRequest, BreakupReport } from "./types";

const API_BASE = "/api";

export async function scanWallet(req: ScanRequest): Promise<{ report: BreakupReport }> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Scan failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
