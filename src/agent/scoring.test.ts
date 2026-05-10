import { describe, it, expect, vi } from "vitest";
import { calculateEarningIndex, calculateLieIndex, classifyInvestmentStyle, getActivityLevel, getRiskLevel, getSmartMoneyRank, scoreWallet } from "./scoring.js";
import type { ScanResult } from "./scanner.js";

vi.mock("../utils/onchainos.js", () => ({
  getSmartMoneyLeaderboard: vi.fn().mockResolvedValue([
    { address: "0xWhale", pnlUsd: 1_000_000, winRate: 0.8, tradeCount: 200, rank: 1 },
    { address: "0xFish", pnlUsd: 50_000, winRate: 0.6, tradeCount: 50, rank: 42 },
  ]),
}));

const defaultBalanceDerivedMetrics = {
  memeTokenCount: 0,
  memeTokenValueUsd: 0,
  memeTokenRatio: 0,
  stablecoinRatio: 0.1,
  bluechipRatio: 0.7,
  tokenCount: 3,
  diversificationScore: 50,
  concentrationRisk: 50,
  topTokenSymbol: "ETH",
  topTokenRatio: 0.7,
};

const defaultBehavioralProfile = {
  avgSlippageLoss: 5,
  memeTradeFrequency: 0.1,
  rugPullCount: 0,
  highRiskTradeCount: 0,
  degenScore: 10,
  chainActivity: { ethereum: 45_230 },
  dominantChain: "ethereum",
  dominantChainReason: "Highest activity",
  confidence: "confirmed" as const,
  dataSource: "dex_history" as const,
  balanceDerivedMetrics: defaultBalanceDerivedMetrics,
};

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
    behavioralProfile: defaultBehavioralProfile,
    pnlConfidence: "confirmed",
    scanMeta: {
      chainsScanned: ["ethereum"],
      dominantChain: "ethereum",
      dominantChainReason: "Default",
      strategySwitch: false,
    },
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

  it("returns degen for high degenScore", () => {
    expect(getRiskLevel(0.5, 10, 70)).toBe("degen");
  });

  it("returns moderate for estimated data with moderate winRate", () => {
    expect(getRiskLevel(0.5, 10, 20, "estimated")).toBe("moderate");
  });

  it("returns degen for estimated data with very high degenScore", () => {
    expect(getRiskLevel(0.5, 10, 80, "estimated")).toBe("degen");
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

  it("tags degen for high degen score", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      behavioralProfile: { ...defaultBehavioralProfile, degenScore: 70 },
    }));
    expect(result).toContain("degen");
  });

  it("tags rug_pull_victim for rug pulls", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      behavioralProfile: { ...defaultBehavioralProfile, rugPullCount: 2 },
    }));
    expect(result).toContain("rug_pull_victim");
  });

  it("tags degen from balance-derived data", () => {
    const result = classifyInvestmentStyle(makeScanResult({
      behavioralProfile: {
        ...defaultBehavioralProfile,
        degenScore: 65,
        dataSource: "balances",
        confidence: "estimated",
        balanceDerivedMetrics: {
          ...defaultBalanceDerivedMetrics,
          memeTokenRatio: 0.4,
          memeTokenCount: 3,
          bluechipRatio: 0.1,
        },
      },
    }));
    expect(result).toContain("degen");
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
});

describe("scoreWallet", () => {
  it("includes behavioral profile in scores", () => {
    const result = scoreWallet(makeScanResult());
    expect(result.behavioralProfile).toBeDefined();
    expect(result.behavioralProfile.degenScore).toBe(10);
    expect(result.behavioralProfile.confidence).toBe("confirmed");
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
