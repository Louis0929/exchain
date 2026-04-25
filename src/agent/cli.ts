#!/usr/bin/env node
import { scanWallet, type ScanResult } from "./scanner.js";
import { scoreWallet } from "./scoring.js";
import { calculateCompensation } from "./calculator.js";
import { generateRoast, generateCaseNumber } from "./roast.js";
import { deployLockContract, depositUSDC } from "./deployer.js";
import { formatScanReport } from "../reports/format.js";
import type { BreakupReport, CompensationParams, LockParams } from "../types/exchain.js";
import { getWalletStatus } from "../utils/onchainos.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command || command === "help") {
    printHelp();
    return;
  }

  if (command === "scan") {
    await runScan(args.slice(1));
  } else if (command === "lock") {
    await runLock(args.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
ExChain — 分手鏈上計算器 & 鏈上關係鎖

Usage:
  exchain scan <address> [--from <date>] [--to <date>] [--chains <chains>]
  exchain lock --amount <USDC> --duration <months> --template <peace|negotiate|punish|custom>

Examples:
  exchain scan 0x28C6c06298d31479934E3D29e2AA5bf86cA32e17 --from 2023-01-01 --to 2025-03-01
  exchain lock --amount 1000 --duration 12 --template peace
`);
}

function parseScanArgs(args: string[]): {
  address: string;
  from?: string;
  to?: string;
  chains?: string[];
} {
  let address = "";
  let from: string | undefined;
  let to: string | undefined;
  let chains: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) {
      from = args[++i];
    } else if (args[i] === "--to" && args[i + 1]) {
      to = args[++i];
    } else if (args[i] === "--chains" && args[i + 1]) {
      chains = args[++i].split(",");
    } else if (!args[i].startsWith("--")) {
      address = args[i];
    }
  }

  if (!address) {
    console.error("Error: wallet address is required");
    process.exit(1);
  }

  return { address, from, to, chains };
}

async function runScan(args: string[]) {
  const { address, from, to, chains } = parseScanArgs(args);
  const relationshipStart = from || "2023-01-01";
  const relationshipEnd = to || new Date().toISOString().split("T")[0];
  const chainList = chains || ["ethereum", "base", "bsc", "arbitrum"];

  console.log(`🔍 正在掃描前任... ${maskAddress(address)}`);
  console.log(`📅 關係期間：${relationshipStart} → ${relationshipEnd}`);
  console.log("");

  // Step animation
  const steps = [
    ["✅", "錢包餘額已取得"],
    ["✅", "持倉明細已解密"],
    ["🔄", "正在分析交易習慣..."],
    ["⏳", "精神損失評估中..."],
    ["⏳", "說謊指數計算中..."],
  ];

  for (const [icon, text] of steps) {
    console.log(`  ${icon} ${text}`);
  }

  console.log("");

  // Run scan
  const scanResult = await scanWallet(address, chainList, "sepolia", relationshipStart, relationshipEnd);

  // Score
  const scores = scoreWallet(scanResult);

  // Calculate compensation
  const selfScan = false; // Could add self-address detection
  const compParams: CompensationParams = {
    exAddress: address,
    totalAssetsUsd: scanResult.totalValue.totalUsd,
    realizedPnlUsd: scanResult.pnlOverview.totalPnlUsd,
    winRate: scanResult.pnlOverview.winRate,
    relationshipStart,
    relationshipEnd,
    baseRate: 0.05,
    profitShareRate: 0.10,
    emotionalMultiplier: true,
  };

  const compensation = calculateCompensation(compParams);

  // Generate roast
  const roast = generateRoast({
    scores,
    compensation,
    totalAssetsUsd: scanResult.totalValue.totalUsd,
    winRate: scanResult.pnlOverview.winRate,
    exAddress: address,
    selfScan,
  });

  // Build report
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

  console.log(formatScanReport(report));
}

async function runLock(args: string[]) {
  const parsed = parseLockArgs(args);
  if (!parsed) return;

  // Check wallet login
  console.log("⛓️ ExChain Lock — 鏈上關係誓約書");
  console.log("");

  const walletStatus = await getWalletStatus().catch(() => ({ loggedIn: false }));
  if (!walletStatus.loggedIn) {
    console.log("⚠️ 請先登入錢包：onchainos wallet login <email>");
    console.log("");
  }

  const lockParams: LockParams = {
    partyA: (walletStatus as any).address || "0x0000000000000000000000000000000000000000",
    partyB: "0x0000000000000000000000000000000000000000", // Will be filled by partner
    amountA: parsed.amount,
    amountB: parsed.amount,
    durationMonths: parsed.duration,
    template: parsed.template,
  };

  console.log("設定確認：");
  console.log(`  ├─ 你: ${parsed.amount} USDC`);
  console.log(`  ├─ 鎖定期: ${parsed.duration} 個月`);
  console.log(`  ├─ 模板: ${parsed.template}`);
  console.log(`  └─ 對方需存入: ${parsed.amount} USDC（等額）`);
  console.log("");

  if (walletStatus.loggedIn) {
    try {
      const contractState = await deployLockContract(lockParams, "sepolia");
      console.log("");
      console.log(`🎉 ExChain Lock 合約已部署！`);
      console.log(`   合約地址: ${contractState.address}`);
      console.log(`   到期日: ${new Date(contractState.deadline * 1000).toISOString().split("T")[0]}`);
      console.log("");
      console.log(`   請讓你的伴侶連接錢包確認 ✍️`);
      console.log(`   [等待對方確認...]`);
    } catch (err: any) {
      console.error(`❌ 部署失敗: ${err.message}`);
    }
  } else {
    console.log("用法：exchain lock --amount <USDC> --duration <months> --template <peace|negotiate|punish|custom>");
  }
}

function parseLockArgs(args: string[]): { amount: number; duration: number; template: "peace" | "negotiate" | "punish" | "custom" } | null {
  let amount = 0;
  let duration = 12;
  let template: "peace" | "negotiate" | "punish" | "custom" = "peace";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && args[i + 1]) {
      amount = parseFloat(args[++i]);
    } else if (args[i] === "--duration" && args[i + 1]) {
      duration = parseInt(args[++i], 10);
    } else if (args[i] === "--template" && args[i + 1]) {
      const t = args[++i];
      if (["peace", "negotiate", "punish", "custom"].includes(t)) {
        template = t as any;
      }
    }
  }

  if (!amount) {
    console.error("Error: --amount is required (e.g., --amount 1000)");
    return null;
  }

  return { amount, duration, template };
}

function maskAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

main().catch((err) => {
  console.error("ExChain error:", err.message);
  process.exit(1);
});
