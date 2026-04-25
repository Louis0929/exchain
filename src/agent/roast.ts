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
    "你的前任勝率 {winRate}%，穩定盈利，在你們在一起的時候悄悄賺了不少。他說「最近手頭緊」的時候，鏈上顯示他剛買了 3 個 NFT 🖼️。",
    "你的前任是個交易高手，勝率 {winRate}%。建議補償金翻倍。下次交往前，用 ExChain Lock 鎖定承諾 🔗",
    "他的交易記錄像開了外掛一樣准，勝率 {winRate}%，這賺的錢肯定有你的份！💰",
    "你的前任簡直是幣圈巴菲特，勝率 {winRate}%，請問他分紅的時候有想到你嗎？",
  ],
  losses: [
    "你的前任勝率只有 {winRate}%，他在鏈上比在感情裡還不靠譜。感情虧也就算了，錢也虧 📉",
    "你的前任在鏈上虧了，也許分手是對的。至少你不用分擔他的虧損。",
    "他的交易記錄像個黑洞，勝率 {winRate}%，錢進去就再也回不來了。",
    "你的前任可能是個反向指標，勝率 {winRate}%，跟他在一起還不如買彩票。",
  ],
  memeOnly: [
    "你的前任是 Meme 幣賭徒，及時止損（分手）是正確的。跟他在一起，你的感情跟 PEPE 幣一樣——瞬間歸零 🐸。",
    "你的前任只買 Meme 幣，喜歡追風口。可惜感情這件事，不是靠 FOMO 就能贏的。",
    "他的錢包裡全是 Dogecoin 和 Shiba，勝率不敢看。跟他談戀愛，就像買了個隨機數字生成器。",
    "你的前任是 Meme 幣收藏家，收集各種零價值代幣，就像收集對你傷害的碎片。",
  ],
  stableOnly: [
    "你的前任連炒幣的勇氣都沒有，全倉穩定幣。分手是你人生中唯一一次冒險 🏃‍♀️。",
    "你的前任只敢持有穩定幣，感情裡估計也一樣——永遠不會有驚喜 🥱。",
    "他的錢包像個保險箱，只放 USDC。這樣的人，談戀愛不如談合作 🤝。",
    "你的前任是穩定幣愛好者，追求安全第一。但愛情這件事，本來就充滿風險啊！",
  ],
  whale: [
    "你的前任是個鯨魚 🐋，錢包裡有 $1,766,587.15。他說沒錢，你信了？",
    "你的前任比中本聰還神秘，錢包裡藏著巨款，卻說自己是「普通上班族」。",
    "他的錢包資產是你年薪的 10 倍，卻連一杯奶茶錢都要跟你 AA。",
    "你的前任是個偽裝成普通人的富豪，錢包裡的資產足以買一套房子了。",
  ],
  zeroBalance: [
    "你的前任是 true degen，錢包比心還空。補償金：$0。窮到連補償金都算不出 🍜。",
    "他的錢包就像他的感情一樣——空無一物。建議下一任找個有錢包餘額的。",
    "你的前任是個流浪漢，錢包裡連 Gas 費都沒有。談戀愛不如談空氣 💨。",
  ],
  selfScan: [
    "掃描自己？你是不是沒有前任 😢 要不要考慮用 ExChain Lock 鎖定自己？",
    "自己掃自己？這是在檢查自己的錢包，還是在檢查自己的傷疤？",
  ],
  default: [
    "你的前任說沒錢，但鏈上不這麼說 👀。",
    "鏈上數據不會說謊，但他會。",
    "他的錢包顯示他很有錢，但他卻說自己是「月光族」。",
    "你的前任藏得很深，但鏈上數據不會騙人。",
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

  if (input.totalAssetsUsd > 1000000) {
    return pickRandom(ROAST_TEMPLATES.whale);
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
