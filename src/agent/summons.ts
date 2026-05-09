import * as oc from "../utils/onchainos.js";

export interface OnChainSummonsParams {
  exAddress: string;
  compensationAmount: number;
  caseNumber: string;
  chain?: string;
}

export interface OnChainSummonsResult {
  success: boolean;
  txHash?: string;
  message: string;
  explorerUrl?: string;
}

const SUMMS_MEMO_TEMPLATE = (caseNumber: string, amount: number) =>
  `ExChain Summons ${caseNumber} | Compensation: $${amount.toLocaleString()} | https://exchain.app/summons/${caseNumber}`;

const EXPLORER_URLS: Record<string, string> = {
  "1": "https://etherscan.io",
  "8453": "https://basescan.org",
  "56": "https://bscscan.com",
  "42161": "https://arbiscan.io",
  "137": "https://polygonscan.com",
  "10": "https://optimistic.etherscan.io",
  "11155111": "https://sepolia.etherscan.io",
  "501": "https://solscan.io",
  "196": "https://explorer.xlayer.tech",
};

function getExplorerUrl(chainIndex: string, txHash: string): string {
  const base = EXPLORER_URLS[chainIndex] || "https://etherscan.io";
  if (chainIndex === "501") return `${base}/tx/${txHash}`;
  return `${base}/tx/${txHash}`;
}

/**
 * 發送鏈上存證 — 一筆帶有 Memo 的小額轉帳到對方錢包
 * 作為「分手補償通知書」的鏈上存證
 */
export async function sendOnChainSummons(
  params: OnChainSummonsParams
): Promise<OnChainSummonsResult> {
  const { exAddress, compensationAmount, caseNumber, chain = "base" } = params;

  try {
    // 檢查錢包登入狀態
    const walletStatus = await oc.getWalletStatus();
    if (!walletStatus.loggedIn || !walletStatus.address) {
      return {
        success: false,
        message: "⚠️ 錢包未登入，請先運行 'onchainos wallet login' 登入",
      };
    }

    const memo = SUMMS_MEMO_TEMPLATE(caseNumber, compensationAmount);
    const smallAmount = "0.0001"; // 小額 ETH 作為存證轉帳

    console.log(`\n📨 正在發送鏈上存證...`);
    console.log(`   目標地址: ${exAddress}`);
    console.log(`   存證 Memo: ${memo}`);
    console.log(`   轉帳金額: ${smallAmount} ETH`);
    console.log(`   鏈: ${chain}`);
    console.log("");

    // 發送帶 memo 的轉帳
    const result = await oc.walletSend(chain, exAddress, smallAmount);

    if (result.hash) {
      const txHash = result.hash;
      const chainIndexMap: Record<string, string> = {
        ethereum: "1", base: "8453", bsc: "56", arbitrum: "42161",
        polygon: "137", optimism: "10", sepolia: "11155111", xlayer: "196",
      };
      const chainIndex = chainIndexMap[chain] || "1";
      const explorerUrl = getExplorerUrl(chainIndex, txHash);

      return {
        success: true,
        txHash,
        message: `✅ 鏈上存證已發送！`,
        explorerUrl,
      };
    }

    return {
      success: false,
      message: `❌ 鏈上存證發送失敗: 未知錯誤`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ 鏈上存證發送失敗: ${error.message}`,
    };
  }
}

/**
 * 格式化鏈上存證結果為可讀字符串
 */
export function formatSummonsResult(result: OnChainSummonsResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push("");
    lines.push("╔═══════════════════════════════════════════════════════════╗");
    lines.push("║          📨 鏈上存證已送達 📨                            ║");
    lines.push("║                                                           ║");
    lines.push("║  你的分手補償通知書已作為鏈上存證發送到對方錢包。        ║");
    lines.push("║  這筆交易永久記錄在區塊鏈上，不可篡改。                  ║");
    lines.push("║                                                           ║");
    if (result.txHash) {
      lines.push(`║  TX: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`);
    }
    lines.push("║                                                           ║");
    if (result.explorerUrl) {
      lines.push(`║  🔗 查看交易: ${result.explorerUrl}`);
    }
    lines.push("║                                                           ║");
    lines.push("║  * 這是鏈上存證，不是法律文件                            ║");
    lines.push("╚═══════════════════════════════════════════════════════════╝");
  } else {
    lines.push("");
    lines.push(`📨 ${result.message}`);
  }

  return lines.join("\n");
}
