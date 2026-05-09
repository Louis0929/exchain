import { Router } from "express";
import { scanWallet } from "../../agent/scanner.js";
import { scoreWallet } from "../../agent/scoring.js";
import { calculateCompensation } from "../../agent/calculator.js";
import { generateRoast, generateCaseNumber } from "../../agent/roast.js";
import { validateScanRequest } from "../middleware/validate.js";
import type { BreakupReport, CompensationParams, ScanRequest } from "../../types/exchain.js";

export const scanRouter = Router();

scanRouter.post("/scan", async (req, res, next) => {
  try {
    const body = req.body as ScanRequest;
    const validationError = validateScanRequest(body);
    if (validationError) {
      res.status(400).json({ error: validationError, code: "INVALID_REQUEST" });
      return;
    }

    const address = body.address;
    const relationshipStart = body.relationshipStart || "2023-01-01";
    const relationshipEnd = body.relationshipEnd || new Date().toISOString().split("T")[0];
    const chains = body.chains;

    const scanResult = await scanWallet(address, chains, "ethereum", relationshipStart, relationshipEnd);
    const scores = scoreWallet(scanResult);

    const compParams: CompensationParams = {
      exAddress: address,
      totalAssetsUsd: scanResult.totalValue.totalUsd,
      realizedPnlUsd: scanResult.pnlOverview.totalPnlUsd,
      winRate: scanResult.pnlOverview.winRate,
      relationshipStart,
      relationshipEnd,
      baseRate: body.baseRate ?? 0.05,
      profitShareRate: body.profitShareRate ?? 0.10,
      emotionalMultiplier: body.emotionalMultiplier ?? true,
    };
    const compensation = calculateCompensation(compParams);

    const roast = generateRoast({
      scores,
      compensation,
      totalAssetsUsd: scanResult.totalValue.totalUsd,
      winRate: scanResult.pnlOverview.winRate,
      exAddress: address,
      selfScan: false,
    });

    const report: BreakupReport = {
      exAddress: address,
      relationshipStart,
      relationshipEnd,
      walletData: {
        totalAssetsUsd: scanResult.totalValue.totalUsd,
        winRate: scanResult.pnlOverview.winRate,
        tradeCount: scanResult.pnlOverview.tradeCount,
      },
      scores,
      compensation,
      roast,
      caseNumber: generateCaseNumber(),
    };

    res.json({ report });
  } catch (err) {
    next(err);
  }
});
