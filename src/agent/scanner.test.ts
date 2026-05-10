import { describe, it, expect, vi, afterEach } from "vitest";
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
  getPortfolioSupportedChains: vi.fn().mockResolvedValue(["1", "8453", "56", "42161"]),
}));

describe("scanWallet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns complete scan result with all fields", async () => {
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.totalValue.totalUsd).toBe(45_230);
    expect(result.balances.address).toBe("0xabc");
    expect(result.pnlOverview.winRate).toBe(0.62);
    expect(result.tokenPnL).toHaveLength(1);
    expect(result.tradeHistory).toHaveLength(1);
    expect(result.behavioralProfile).toBeDefined();
    expect(result.behavioralProfile.confidence).toBe("confirmed");
    expect(result.behavioralProfile.dataSource).toBe("dex_history");
    expect(result.pnlConfidence).toBe("confirmed");
    expect(result.scanMeta.chainsScanned).toContain("ethereum");
  });

  it("extracts behavioral profile with degen score", async () => {
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.behavioralProfile.degenScore).toBeGreaterThanOrEqual(0);
    expect(result.behavioralProfile.dominantChain).toBeDefined();
    expect(result.behavioralProfile.chainActivity).toBeDefined();
    expect(result.behavioralProfile.balanceDerivedMetrics).toBeDefined();
  });

  it("uses default chains when not specified", async () => {
    const result = await scanWallet("0xabc");
    expect(result.totalValue.totalUsd).toBe(45_230);
  });

  it("returns fallback values when total-value fails", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTotalValue).mockRejectedValue(new Error("API timeout"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.totalValue.totalUsd).toBe(0);
  }, 15_000);

  it("returns fallback values when balances fail", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getAllBalances).mockRejectedValue(new Error("Empty wallet"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.balances.chains).toEqual([]);
  }, 15_000);

  it("returns empty arrays when PnL data fails", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTokenPnL).mockRejectedValue(new Error("timeout"));
    vi.mocked(oc.getDexHistory).mockRejectedValue(new Error("timeout"));
    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.tokenPnL).toEqual([]);
    expect(result.tradeHistory).toEqual([]);
  }, 15_000);

  it("derives behavioral profile from balances when no DEX data", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTokenPnL).mockResolvedValue([]);
    vi.mocked(oc.getDexHistory).mockResolvedValue([]);
    vi.mocked(oc.getPortfolioOverview).mockResolvedValue({
      address: "0xabc", totalPnlUsd: 0, winRate: 0, tradeCount: 0,
      avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 },
    });
    vi.mocked(oc.getAllBalances).mockResolvedValue({
      address: "0xabc",
      chains: [{
        chain: "ethereum",
        tokens: [
          { token: "PEPE", symbol: "PEPE", amount: 1000000, valueUsd: 5000, chain: "ethereum" },
          { token: "DOGE", symbol: "DOGE", amount: 5000, valueUsd: 3000, chain: "ethereum" },
          { token: "ETH", symbol: "ETH", amount: 2, valueUsd: 6000, chain: "ethereum" },
        ],
        totalUsd: 14_000,
      }],
    });
    vi.mocked(oc.getTotalValue).mockResolvedValue({ totalUsd: 14_000, chains: { ethereum: 14_000 } });

    const result = await scanWallet("0xabc", ["ethereum"]);
    expect(result.behavioralProfile.dataSource).toBe("balances");
    expect(result.behavioralProfile.confidence).toBe("estimated");
    expect(result.behavioralProfile.degenScore).toBeGreaterThan(0);
    expect(result.behavioralProfile.balanceDerivedMetrics).toBeDefined();
    expect(result.behavioralProfile.balanceDerivedMetrics!.memeTokenRatio).toBeGreaterThan(0);
    expect(result.pnlConfidence).toBe("estimated");
  }, 15_000);

  it("produces deterministic estimated winRate (no randomness)", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getTokenPnL).mockResolvedValue([]);
    vi.mocked(oc.getDexHistory).mockResolvedValue([]);
    vi.mocked(oc.getPortfolioOverview).mockResolvedValue({
      address: "0xabc", totalPnlUsd: 0, winRate: 0, tradeCount: 0,
      avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 },
    });
    vi.mocked(oc.getAllBalances).mockResolvedValue({
      address: "0xabc",
      chains: [{
        chain: "ethereum",
        tokens: [{ token: "ETH", symbol: "ETH", amount: 10, valueUsd: 30_000, chain: "ethereum" }],
        totalUsd: 30_000,
      }],
    });
    vi.mocked(oc.getTotalValue).mockResolvedValue({ totalUsd: 30_000, chains: { ethereum: 30_000 } });

    const result1 = await scanWallet("0xabc", ["ethereum"]);
    const result2 = await scanWallet("0xabc", ["ethereum"]);
    expect(result1.pnlOverview.winRate).toBe(result2.pnlOverview.winRate);
  }, 15_000);
});
