import { describe, it, expect } from "vitest";
import { calculateEarningIndex, calculateLieIndex, classifyInvestmentStyle, getActivityLevel, getRiskLevel } from "./scoring.js";
import type { ScanResult } from "./scanner.js";

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
