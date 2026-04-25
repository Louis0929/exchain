import { describe, it, expect, vi } from "vitest";
import { scanWallet } from "./scanner.js";

vi.mock("../utils/onchainos.js", () => ({
  getTotalValue: vi.fn().mockResolvedValue({ totalUsd: 45_230, chains: { ethereum: 30_000, base: 15_230 } }),
  getAllBalances: vi.fn().mockResolvedValue({
    address: "0xabc",
    chains: [
      { chain: "ethereum", tokens: [{ token: "ETH", symbol: "ETH", amount: 10, valueUsd: 30_000, chain: "ethereum" }], totalUsd: 30_000 },
    ],
  }),
  getPortfolioOverview: vi.fn().mockResolvedValue({
    address: "0xabc",
    totalPnlUsd: 18_900,
    winRate: 0.62,
    tradeCount: 45,
    avgHoldingTime: "3d",
    bestTrade: { token: "ETH", pnlUsd: 5000 },
    worstTrade: { token: "DOGE", pnlUsd: -2000 },
  }),
  getTokenPnL: vi.fn().mockResolvedValue([
    { token: "ETH", symbol: "ETH", buyUsd: 20_000, sellUsd: 25_000, pnlUsd: 5000, pnlPercent: 0.25, holdingAmount: 10, holdingValueUsd: 30_000 },
  ]),
  getDexHistory: vi.fn().mockResolvedValue([
    { hash: "0x123", tokenIn: "USDC", tokenOut: "ETH", amountIn: 5000, amountOut: 1.5, valueUsd: 5000, timestamp: 1700000000000, chain: "ethereum" },
  ]),
}));

describe("scanWallet", () => {
  it("returns complete scan result with all fields", async () => {
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.totalValue.totalUsd).toBe(45_230);
    expect(result.balances.address).toBe("0xabc");
    expect(result.pnlOverview.winRate).toBe(0.62);
    expect(result.tokenPnL).toHaveLength(1);
    expect(result.tradeHistory).toHaveLength(1);
  });

  it("uses default chains when not specified", async () => {
    const result = await scanWallet("0xabc");
    expect(result.totalValue.totalUsd).toBe(45_230);
  });

  it("returns fallback values when total-value fails", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTotalValue).mockRejectedValueOnce(new Error("API timeout"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.totalValue.totalUsd).toBe(0);
  });

  it("returns fallback values when balances fail", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getAllBalances).mockRejectedValueOnce(new Error("Empty wallet"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.balances.chains).toEqual([]);
  });

  it("returns empty arrays when PnL data fails", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTokenPnL).mockRejectedValueOnce(new Error("timeout"));
    vi.mocked(oc.getDexHistory).mockRejectedValueOnce(new Error("timeout"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.tokenPnL).toEqual([]);
    expect(result.tradeHistory).toEqual([]);
  });
});
