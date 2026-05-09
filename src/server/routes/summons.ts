import { Router } from "express";
import { walletSend, getWalletStatus } from "../../utils/onchainos.js";

export const summonsRouter = Router();

interface SummonsRequest {
  recipientAddress: string;
  amount?: string;       // USDC amount, default "0.01"
  chain?: string;        // default "base" (cheap fees)
  caseNumber: string;
  compensationTotal: number;
}

summonsRouter.post("/summons", async (req, res, next) => {
  try {
    const { recipientAddress, amount, chain, caseNumber, compensationTotal } = req.body as SummonsRequest;

    if (!recipientAddress) {
      res.status(400).json({ error: "recipientAddress is required", code: "INVALID_REQUEST" });
      return;
    }

    // Check wallet login status
    const walletStatus = await getWalletStatus().catch(() => ({ loggedIn: false }));
    if (!walletStatus.loggedIn) {
      res.status(401).json({
        error: "請先登入 OKX 錢包才能發送鏈上存證",
        code: "WALLET_NOT_LOGGED_IN",
        hint: "Run: onchainos wallet login <email>",
      });
      return;
    }

    const sendAmount = amount || "0.01";
    const sendChain = chain || "base";

    const memo = `ExChain Summons #${caseNumber} | Claim: $${Math.round(compensationTotal).toLocaleString()} USD`;

    const result = await walletSend(sendChain, recipientAddress, sendAmount, { contractToken: true });

    res.json({
      success: true,
      txHash: (result as any).txHash || "pending",
      chain: sendChain,
      amount: sendAmount,
      memo,
      message: `鏈上存證已發送！${sendAmount} USDC 已轉帳至 ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
    });
  } catch (err) {
    next(err);
  }
});
