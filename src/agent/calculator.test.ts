import { describe, it, expect } from "vitest";
import { calculateCompensation } from "./calculator.js";
import type { CompensationParams } from "../types/exchain.js";

describe("calculateCompensation", () => {
  const baseParams: CompensationParams = {
    exAddress: "0xabc",
    totalAssetsUsd: 45_230,
    realizedPnlUsd: 18_900,
    winRate: 0.62,
    relationshipStart: "2023-01-01",
    baseRate: 0.05,
    profitShareRate: 0.10,
    emotionalMultiplier: true,
  };

  it("calculates base compensation correctly", () => {
    const result = calculateCompensation(baseParams);
    expect(result.baseCompensation).toBe(2261.5);
  });

  it("calculates profit share correctly", () => {
    const result = calculateCompensation(baseParams);
    expect(result.profitShare).toBe(1890);
  });

  it("applies 1.5x emotional multiplier when winRate > 70%", () => {
    const result = calculateCompensation({ ...baseParams, winRate: 0.75 });
    expect(result.emotionalMultiplier).toBe(1.5);
    expect(result.emotionalDamages).toBeGreaterThan(0);
  });

  it("applies 0.5x emotional multiplier when winRate < 30%", () => {
    const result = calculateCompensation({ ...baseParams, winRate: 0.2 });
    expect(result.emotionalMultiplier).toBe(0.5);
    expect(result.emotionalDamages).toBeLessThan(0);
  });

  it("applies 1.0x emotional multiplier when 30% <= winRate <= 70%", () => {
    const result = calculateCompensation({ ...baseParams, winRate: 0.5 });
    expect(result.emotionalMultiplier).toBe(1.0);
    expect(result.emotionalDamages).toBe(0);
  });

  it("skips emotional multiplier when disabled", () => {
    const result = calculateCompensation({ ...baseParams, emotionalMultiplier: false, winRate: 0.8 });
    expect(result.emotionalMultiplier).toBe(1.0);
    expect(result.emotionalDamages).toBe(0);
  });

  it("returns $0 total for zero assets", () => {
    const result = calculateCompensation({ ...baseParams, totalAssetsUsd: 0, realizedPnlUsd: 0 });
    expect(result.total).toBe(0);
  });

  it("matches PRD example: $45K assets, $18.9K PnL, 62% winRate", () => {
    const result = calculateCompensation(baseParams);
    // base: 2261.5 + profit: 1890 = 4151.5
    // emotional: 62% is normal → ×1.0 → 0
    // total: 4151.5
    expect(result.total).toBe(4151.5);
  });

  it("supports custom baseRate", () => {
    const result = calculateCompensation({ ...baseParams, baseRate: 0.20 });
    expect(result.baseCompensation).toBe(9046);
  });

  it("supports custom profitShareRate", () => {
    const result = calculateCompensation({ ...baseParams, profitShareRate: 0.50 });
    expect(result.profitShare).toBe(9450);
  });
});
