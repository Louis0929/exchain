export interface EarningScore {
  score: number;        // 0-100
  label: string;        // "窮到連補償金都算不出" | "小蝦米" | ... | "鯨魚"
  totalAssetsUsd: number;
}

export type InvestmentTag =
  | "diamond_hands"
  | "paper_hands"
  | "whale"
  | "shrimp"
  | "defi_farmer"
  | "meme_player"
  | "nft_collector"
  | "trend_trader";

export const INVESTMENT_TAG_LABELS: Record<InvestmentTag, string> = {
  diamond_hands: "💎 鑽石手",
  paper_hands: "🧻 紙手",
  whale: "🐋 鯨魚",
  shrimp: "🦐 小蝦米",
  defi_farmer: "🌾 DeFi 農夫",
  meme_player: "🐶 Meme 玩家",
  nft_collector: "🎨 NFT 收藏家",
  trend_trader: "📈 趨勢交易者",
};

export interface WalletScores {
  earningIndex: EarningScore;
  investmentTags: InvestmentTag[];
  lieIndex: number;     // 0-100
  activityLevel: "gym_rat" | "chill";  // 🏋️ 鏈上健身狂 | 🦥 佛系持幣
  riskLevel: "conservative" | "moderate" | "aggressive" | "degen";
}

export interface CompensationParams {
  exAddress: string;
  totalAssetsUsd: number;
  realizedPnlUsd: number;
  winRate: number;
  relationshipStart: string;   // ISO date
  relationshipEnd?: string;    // ISO date, defaults to now
  baseRate: number;            // 0.01-0.20, default 0.05
  profitShareRate: number;     // 0-0.50, default 0.10
  emotionalMultiplier: boolean;
}

export interface CompensationResult {
  baseCompensation: number;
  profitShare: number;
  emotionalDamages: number;
  emotionalMultiplier: number;
  total: number;
  currency: "USD";
  breakdown: {
    label: string;
    amount: number;
    detail: string;
  }[];
}

export type LockTemplate = "peace" | "negotiate" | "punish" | "custom";

export interface LockParams {
  partyA: string;
  partyB: string;
  amountA: number;        // USDC amount
  amountB: number;
  durationMonths: number;
  template: LockTemplate;
  customSplitRatio?: number;  // basis points for party A, only for "custom"
}

export interface LockContractState {
  address: string;
  partyA: string;
  partyB: string;
  amountA: number;
  amountB: number;
  deadline: number;       // unix timestamp
  splitRatio: number;     // basis points for party A
  isActive: boolean;
  aDeposited: boolean;
  bDeposited: boolean;
}

export interface ScanRequest {
  address: string;
  relationshipStart?: string;
  relationshipEnd?: string;
  chains?: string[];
  baseRate?: number;
  profitShareRate?: number;
  emotionalMultiplier?: boolean;
}

export interface BreakupReport {
  exAddress: string;
  relationshipStart: string;
  relationshipEnd: string;
  walletData: {
    totalAssetsUsd: number;
    winRate: number;
    tradeCount: number;
  };
  scores: WalletScores;
  compensation: CompensationResult;
  roast: string;
  caseNumber: string;
}
