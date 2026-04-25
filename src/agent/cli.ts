#!/usr/bin/env node
import { scanWallet, type ScanResult } from "./scanner.js";
import { scoreWallet } from "./scoring.js";
import { calculateCompensation } from "./calculator.js";
import { generateRoast, generateCaseNumber } from "./roast.js";
import { formatScanReport } from "../reports/format.js";
import type { BreakupReport, CompensationParams } from "../types/exchain.js";

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
  const scanResult = await scanWallet(address, chainList);

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
  console.log("⛓️ ExChain Lock — 鏈上關係誓約書");
  console.log("");
  console.log("⚠️ ExChain Lock 功能需要錢包登入和合約部署。");
  console.log("請使用 onchainos wallet login 登入後再操作。");
  console.log("");
  console.log("用法：exchain lock --amount <USDC> --duration <months> --template <peace|negotiate|punish|custom>");
}

function maskAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

main().catch((err) => {
  console.error("ExChain error:", err.message);
  process.exit(1);
});
