export interface PortfolioTotalValue {
  totalUsd: number;
  chains: Record<string, number>;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  amount: number;
  valueUsd: number;
  chain: string;
}

export interface PortfolioBalances {
  address: string;
  chains: {
    chain: string;
    tokens: TokenBalance[];
    totalUsd: number;
  }[];
}

export interface PnLOverview {
  address: string;
  totalPnlUsd: number;
  winRate: number;
  tradeCount: number;
  avgHoldingTime: string;
  bestTrade: { token: string; pnlUsd: number };
  worstTrade: { token: string; pnlUsd: number };
}

export interface TokenPnL {
  token: string;
  symbol: string;
  buyUsd: number;
  sellUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  holdingAmount: number;
  holdingValueUsd: number;
}

export interface DexTrade {
  hash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  valueUsd: number;
  timestamp: number;
  chain: string;
}

export interface SmartMoneyEntry {
  address: string;
  pnlUsd: number;
  winRate: number;
  tradeCount: number;
  rank: number;
}

export interface GasEstimate {
  gasLimit: number;
  gasPrice: string;
  totalCostEth: number;
  totalCostUsd: number;
}

export interface TxSimulation {
  success: boolean;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  error?: string;
}

export interface SecurityScanResult {
  riskLevel: "safe" | "warning" | "danger";
  issues: string[];
  score: number;
}

export interface TxBroadcastResult {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
}

export interface WalletStatus {
  loggedIn: boolean;
  address?: string;
  chain?: string;
}
