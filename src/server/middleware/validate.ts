import type { ScanRequest } from "../../types/exchain.js";

export function validateScanRequest(body: Partial<ScanRequest>): string | null {
  if (!body.address || typeof body.address !== "string" || body.address.trim().length < 10) {
    return "address is required and must be a valid wallet address";
  }
  const addr = body.address.trim();
  const isEvm = addr.startsWith("0x") && addr.length === 42;
  const isBtcSegwit = addr.startsWith("bc1");
  const isBtcLegacy = addr.startsWith("1") || addr.startsWith("3");
  const isSolana = addr.length === 44 && /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(addr);
  if (!isEvm && !isBtcSegwit && !isBtcLegacy && !isSolana) {
    return "address format not recognized — expected EVM (0x...), Bitcoin (bc1.../1.../3...), or Solana (base58 44 chars)";
  }
  if (body.baseRate !== undefined && (body.baseRate < 0.01 || body.baseRate > 0.20)) {
    return "baseRate must be between 0.01 and 0.20";
  }
  if (body.profitShareRate !== undefined && (body.profitShareRate < 0 || body.profitShareRate > 0.50)) {
    return "profitShareRate must be between 0 and 0.50";
  }
  return null;
}
