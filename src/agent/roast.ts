import type { WalletScores, CompensationResult } from "../types/exchain.js";
import { INVESTMENT_TAG_LABELS } from "../types/exchain.js";

interface RoastInput {
  scores: WalletScores;
  compensation: CompensationResult;
  totalAssetsUsd: number;
  winRate: number;
  exAddress: string;
  selfScan: boolean;
}

const ROAST_TEMPLATES = {
  highWinRate: [
    "你的前任勝率 {winRate}%，穩定盈利，在你們在一起的時候悄悄賺了不少。他說「最近手頭緊」的時候，鏈上顯示他剛買了 3 個 NFT。",
    "你的前任是個交易高手，勝率 {winRate}%。建議補償金翻倍。下次交往前，用 ExChain Lock 鎖定承諾 🔗",
  ],
  losses: [
    "你的前任在鏈上虧了，也許分手是對的。至少你不用分擔他的虧損。",
    "你的前任勝率只有 {winRate}%，他在鏈上比在感情裡還不靠譜。",
  ],
  memeOnly: [
    "你的前任是 Meme 幣賭徒，及時止損（分手）是正確的。",
    "你的前任只買 Meme 幣，跟這種人在一起，你的感情跟 PEPE 幣一樣——瞬間歸零。",
  ],
  stableOnly: [
    "你的前任連炒幣的勇氣都沒有，全倉穩定幣。分手是你人生中唯一一次冒險。",
    "你的前任只敢持有穩定幣，感情裡估計也一樣——永遠不會有驚喜。",
  ],
  zeroBalance: [
    "你的前任是 true degen，錢包比心還空。補償金：$0。窮到連補償金都算不出。",
  ],
  selfScan: [
    "掃描自己？你是不是沒有前任 😢",
  ],
  default: [
    "你的前任說沒錢，但鏈上不這麼說。",
    "鏈上數據不會說謊，但他會。",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoast(input: RoastInput): string {
  if (input.selfScan) {
    return pickRandom(ROAST_TEMPLATES.selfScan);
  }

  if (input.totalAssetsUsd <= 0) {
    return pickRandom(ROAST_TEMPLATES.zeroBalance);
  }

  const tagLabels = input.scores.investmentTags
    .map((t) => INVESTMENT_TAG_LABELS[t])
    .join(" | ");

  if (input.scores.investmentTags.includes("meme_player")) {
    return pickRandom(ROAST_TEMPLATES.memeOnly);
  }

  if (input.winRate > 0.7) {
    return pickRandom(ROAST_TEMPLATES.highWinRate).replace("{winRate}", String(Math.round(input.winRate * 100)));
  }

  if (input.winRate < 0.3) {
    return pickRandom(ROAST_TEMPLATES.losses).replace("{winRate}", String(Math.round(input.winRate * 100)));
  }

  return pickRandom(ROAST_TEMPLATES.default);
}

export function generateCaseNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `EX-${y}-${m}${d}-${seq}`;
}
