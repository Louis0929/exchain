export interface EarningScore {
  score: number;
  label: string;
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
  lieIndex: number;
  activityLevel: "gym_rat" | "chill";
  riskLevel: "conservative" | "moderate" | "aggressive" | "degen";
}

export interface CompensationResult {
  baseCompensation: number;
  profitShare: number;
  emotionalDamages: number;
  emotionalMultiplier: number;
  total: number;
  currency: "USD";
  breakdown: { label: string; amount: number; detail: string }[];
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

export interface ScanRequest {
  address: string;
  relationshipStart?: string;
  relationshipEnd?: string;
  chains?: string[];
  baseRate?: number;
  profitShareRate?: number;
  emotionalMultiplier?: boolean;
}
