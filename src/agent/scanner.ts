import * as oc from "../utils/onchainos.js";
import type {
  PortfolioTotalValue,
  PortfolioBalances,
  PnLOverview,
  TokenPnL,
  DexTrade,
} from "../types/onchainos.js";

export interface ScanResult {
  totalValue: PortfolioTotalValue;
  balances: PortfolioBalances;
  pnlOverview: PnLOverview;
  tokenPnL: TokenPnL[];
  tradeHistory: DexTrade[];
}

const DEFAULT_CHAINS = ["sepolia", "ethereum", "base", "bsc", "arbitrum"];

export async function scanWallet(
  address: string,
  chains: string[] = DEFAULT_CHAINS,
  primaryChain = "sepolia"
): Promise<ScanResult> {
  const [totalValue, balances, pnlOverview, tokenPnL, tradeHistory] =
    await Promise.all([
      oc.getTotalValue(address, chains).catch((e) => {
        console.warn(`total-value failed: ${e.message}`);
        return { totalUsd: 0, chains: {} };
      }),
      oc.getAllBalances(address, chains).catch((e) => {
        console.warn(`all-balances failed: ${e.message}`);
        return { address, chains: [] };
      }),
      oc.getPortfolioOverview(address, primaryChain).catch((e) => {
        console.warn(`portfolio-overview failed: ${e.message}`);
        return { address, totalPnlUsd: 0, winRate: 0, tradeCount: 0, avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 } };
      }),
      oc.getTokenPnL(address, primaryChain).catch((e) => {
        console.warn(`token-pnl failed: ${e.message}`);
        return [];
      }),
      oc.getDexHistory(address, primaryChain).catch((e) => {
        console.warn(`dex-history failed: ${e.message}`);
        return [];
      }),
    ]);

  return { totalValue, balances, pnlOverview, tokenPnL, tradeHistory };
}
