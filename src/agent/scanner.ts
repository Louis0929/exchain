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

const DEFAULT_CHAINS = ["ethereum", "base", "bsc", "arbitrum"];

export async function scanWallet(
  address: string,
  chains: string[] = DEFAULT_CHAINS,
  primaryChain = "ethereum",
  beginDate?: string,
  endDate?: string
): Promise<ScanResult> {
  let beginMs: number | undefined;
  let endMs: number | undefined;

  // Detect Solana address (starts with 1, 2, 3, 4, 5, 6, 7, 8, 9, A, B, C, D, E, F, G, H, J, K, L, M, N, P, Q, R, S, T, U, V, W, X, Y, Z, a, b, c, d, e, f, g, h, i, j, k, m, n, o, p, q, r, s, t, u, v, w, x, y, z)
  if (address.length > 30 && !address.startsWith("0x")) {
    chains = ["solana"];
    primaryChain = "solana";
  }

  if (beginDate) {
    beginMs = new Date(beginDate).getTime();
  }
  if (endDate) {
    endMs = new Date(endDate).getTime();
  }

  const [totalValue, balances, pnlOverview, tokenPnL, tradeHistory] =
    await Promise.all([
      // For Solana, getTotalValue might fail or return empty, so default to 0
      oc.getTotalValue(address, chains).catch((e) => {
        console.warn(`total-value failed: ${e.message}`);
        return { totalUsd: 0, chains: {} };
      }),
      // Skip getAllBalances for Solana addresses to avoid errors
      (primaryChain === "solana"
        ? Promise.resolve({ address, chains: [] })
        : oc.getAllBalances(address, chains).catch((e) => {
            console.warn(`all-balances failed: ${e.message}`);
            return { address, chains: [] };
          })
      ),
      oc.getPortfolioOverview(address, primaryChain).catch((e) => {
        console.warn(`portfolio-overview failed: ${e.message}`);
        return { address, totalPnlUsd: 0, winRate: 0, tradeCount: 0, avgHoldingTime: "0", bestTrade: { token: "", pnlUsd: 0 }, worstTrade: { token: "", pnlUsd: 0 } };
      }),
      (async () => {
        try {
          return await oc.getTokenPnL(address, primaryChain);
        } catch (e) {
          console.warn(`token-pnl failed: ${e.message}`);
          return [];
        }
      })(),
      oc.getDexHistory(address, primaryChain, beginMs, endMs).catch((e) => {
        console.warn(`dex-history failed: ${e.message}`);
        return [];
      }),
    ]);

  return { totalValue, balances, pnlOverview, tokenPnL, tradeHistory };
}
