import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { scanWallet } from "../agent/scanner.js";
import { scoreWallet } from "../agent/scoring.js";
import { calculateCompensation } from "../agent/calculator.js";
import { generateRoast, generateCaseNumber } from "../agent/roast.js";
import { walletSend, getWalletStatus } from "../utils/onchainos.js";
import { validateScanRequest } from "./middleware/validate.js";
import type { BreakupReport, CompensationParams, ScanRequest } from "../types/exchain.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 10, message: { error: "Too many requests", code: "RATE_LIMITED" } }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/scan", async (req, res, next) => {
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

app.post("/api/summons", async (req, res, next) => {
  try {
    const { recipientAddress, amount, chain, caseNumber, compensationTotal } = req.body as {
      recipientAddress: string;
      amount?: string;
      chain?: string;
      caseNumber: string;
      compensationTotal: number;
    };

    if (!recipientAddress) {
      res.status(400).json({ error: "recipientAddress is required", code: "INVALID_REQUEST" });
      return;
    }

    const walletStatus = await getWalletStatus().catch(() => ({ loggedIn: false }));
    if (!(walletStatus as any).loggedIn) {
      res.status(401).json({
        error: "請先登入 OKX 錢包才能發送鏈上存證",
        code: "WALLET_NOT_LOGGED_IN",
        hint: "Run: onchainos wallet login <email>",
      });
      return;
    }

    const sendAmount = amount || "0.01";
    const sendChain = chain || "base";
    const result = await walletSend(sendChain, recipientAddress, sendAmount, { contractToken: true });

    res.json({
      success: true,
      txHash: (result as any).txHash || "pending",
      chain: sendChain,
      amount: sendAmount,
      message: `鏈上存證已發送！${sendAmount} USDC 已轉帳至 ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
    });
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error:", err.message);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
});

app.listen(PORT, () => console.log(`ExChain API running on :${PORT}`));
