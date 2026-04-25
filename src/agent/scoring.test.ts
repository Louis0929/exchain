import { describe, it, expect, vi } from "vitest";
import { calculateEarningIndex, calculateLieIndex, classifyInvestmentStyle, getActivityLevel, getRiskLevel, getSmartMoneyRank } from "./scoring.js";
import type { ScanResult } from "./scanner.js";

vi.mock("../utils/onchainos.js", () => ({
  getSmartMoneyLeaderboard: vi.fn().mockResolvedValue([
    { address: "0xWhale", pnlUsd: 1_000_000, winRate: 0.8, tradeCount: 200, rank: 1 },
    { address: "0xFish", pnlUsd: 50_000, winRate: 0.6, tradeCount: 50, rank: 42 },
  ]),
}));

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    totalValue: { totalUsd: 45_230, chains: { ethereum: 45_230 } },
    balances: {
      address: "0xabc",
      chains: [{
        chain: "ethereum",
        tokens: [{ token: "ETH", symbol: "ETH", amount: 10, valueUsd: 45_230, chain: "ethereum" }],
        totalUsd: 45_230,
      }],
    },
    pnlOverview: {
      address: "0xabc", totalPnlUsd: 18_900, winRate: 0.62, tradeCount: 45,
      avgHoldingTime: "3d", bestTrade: { token: "ETH", pnlUsd: 5000 }, worstTrade: { token: "DOGE", pnlUsd: -2000 },
    },
    tokenPnL: [],
    tradeHistory: [],
    ...overrides,
  };
}

describe("calculateEarningIndex", () => {
  it("returns score 0 for zero balance", () => {
    const result = calculateEarningIndex(0);
    expect(result.score).toBe(0);
    expect(result.label).toContain("窮到");
  });

  it("returns shrimp label for small amounts", () => {
    const result = calculateEarningIndex(50);
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it("returns whale label for large amounts", () => {
    const result = calculateEarningIndex(500_000);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.label).toContain("鯨魚");
  });

  it("returns megawhale for $1M+", () => {
    const result = calculateEarningIndex(2_000_000);
    expect(result.score).toBe(100);
  });
});

describe("calculateLieIndex", () => {
  it("returns 0 when not claiming broke", () => {
    expect(calculateLieIndex(50_000, false)).toBe(0);
  });

  it("returns high lie index for wealthy ex claiming broke", () => {
    expect(calculateLieIndex(100_000, true)).toBe(95);
  });

  it("returns 0 for zero balance", () => {
    expect(calculateLieIndex(0, true)).toBe(0);
  });

  it("returns low lie index for genuinely broke ex", () => {
    expect(calculateLieIndex(500, true)).toBeLessThanOrEqual(30);
  });
});

describe("getActivityLevel", () => {
  it("returns gym_rat for high trade count", () => {
    expect(getActivityLevel(100)).toBe("gym_rat");
  });

  it("returns chill for low trade count", () => {
    expect(getActivityLevel(10)).toBe("chill");
  });
});

describe("getRiskLevel", () => {
  it("returns degen for low winRate with many trades", () => {
    expect(getRiskLevel(0.2, 30)).toBe("degen");
  });

  it("returns conservative for high winRate", () => {
    expect(getRiskLevel(0.7, 50)).toBe("conservative");
  });

  it("returns moderate for average winRate", () => {
    expect(getRiskLevel(0.5, 20)).toBe("moderate");
  });
});

describe("classifyInvestmentStyle", () => {
  it("tags whale for large portfolios", () => {
    const result = classifyInvestmentStyle(makeScanResult({ totalValue: { totalUsd: 200_000, chains: {} } }));
    expect(result).toContain("whale");
  });

  it("tags shrimp for small portfolios", () => {
    const result = classifyInvestmentStyle(makeScanResult({ totalValue: { totalUsd: 500, chains: {} } }));
    expect(result).toContain("shrimp");
  });

  it("tags meme_player for meme-heavy portfolio", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      totalValue: { totalUsd: 10_000, chains: {} },
      balances: {
        address: "0xabc",
        chains: [{
          chain: "ethereum",
          tokens: [
            { token: "DOGE", symbol: "DOGE", amount: 50000, valueUsd: 5000, chain: "ethereum" },
            { token: "PEPE", symbol: "PEPE", amount: 1000000, valueUsd: 3000, chain: "ethereum" },
            { token: "SHIB", symbol: "SHIB", amount: 5000000, valueUsd: 2000, chain: "ethereum" },
          ],
          totalUsd: 10_000,
        }],
      },
    }));
    expect(result).toContain("meme_player");
  });

  it("tags defi_farmer for DeFi holdings", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      balances: {
        address: "0xabc",
        chains: [{
          chain: "ethereum",
          tokens: [
            { token: "AAVE", symbol: "AAVE", amount: 100, valueUsd: 15_000, chain: "ethereum" },
            { token: "COMP", symbol: "COMP", amount: 50, valueUsd: 5_000, chain: "ethereum" },
          ],
          totalUsd: 20_000,
        }],
      },
    }));
    expect(result).toContain("defi_farmer");
  });

  it("tags paper_hands for stablecoin-heavy portfolio", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      totalValue: { totalUsd: 10_000, chains: {} },
      balances: {
        address: "0xabc",
        chains: [{
          chain: "ethereum",
          tokens: [{ token: "USDC", symbol: "USDC", amount: 8000, valueUsd: 8000, chain: "ethereum" }],
          totalUsd: 10_000,
        }],
      },
    }));
    expect(result).toContain("paper_hands");
  });

  it("defaults to trend_trader when no specific tags apply", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      totalValue: { totalUsd: 10_000, chains: {} },
      balances: {
        address: "0xabc",
        chains: [{
          chain: "ethereum",
          tokens: [{ token: "ETH", symbol: "ETH", amount: 3, valueUsd: 10_000, chain: "ethereum" }],
          totalUsd: 10_000,
        }],
      },
      pnlOverview: {
        address: "0xabc", totalPnlUsd: 0, winRate: 0.5, tradeCount: 3,
        avgHoldingTime: "1d", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 },
      },
    }));
    expect(result).toContain("trend_trader");
  });

  it("tags diamond_hands for high win rate with many trades", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      pnlOverview: {
        address: "0xabc", totalPnlUsd: 10_000, winRate: 0.75, tradeCount: 15,
        avgHoldingTime: "7d", bestTrade: { token: "ETH", pnlUsd: 5000 }, worstTrade: { token: "DOGE", pnlUsd: -500 },
      },
    }));
    expect(result).toContain("diamond_hands");
  });
});

describe("getSmartMoneyRank", () => {
  it("returns rank for address on leaderboard", async () => {
    const rank = await getSmartMoneyRank("0xWhale");
    expect(rank).toBe(1);
  });

  it("returns null for address not on leaderboard", async () => {
    const rank = await getSmartMoneyRank("0xNobody");
    expect(rank).toBeNull();
  });

  it("returns null when API fails", async () => {
    const oc = await import("../utils/onchainos.js");
    vi.mocked(oc.getSmartMoneyLeaderboard).mockRejectedValueOnce(new Error("API error"));
    const rank = await getSmartMoneyRank("0xWhale");
    expect(rank).toBeNull();
  });
});
