import * as oc from "../utils/onchainos.js";
import type { LockParams, LockContractState } from "../types/exchain.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SPLIT_RATIOS: Record<string, number> = {
  peace: 10000,      // Each party gets 100% back
  negotiate: 6000,   // Party A gets 60%
  punish: 8000,      // "Wrong" party gets less — Party A gets 80% if they're the wronged one
  custom: 10000,     // Overridden by customSplitRatio
};

function getContractArtifact(): { bytecode: string; abi: any[] } {
  const artifactPath = resolve(
    import.meta.dirname ?? ".",
    "../../contracts/artifacts/contracts/ExChainLock.sol/ExChainLock.json"
  );

  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return { bytecode: artifact.bytecode, abi: artifact.abi };
}

function encodeConstructorArgs(params: LockParams): string {
  // Simplified: in production, use ethers.js ABI encoder
  // For now, return placeholder — actual encoding will happen on deploy
  return JSON.stringify({
    partyA: params.partyA,
    partyB: params.partyB,
    amountA: params.amountA,
    amountB: params.amountB,
    durationSeconds: params.durationMonths * 30 * 24 * 3600,
    splitRatio: params.template === "custom" && params.customSplitRatio
      ? params.customSplitRatio
      : SPLIT_RATIOS[params.template],
  });
}

export async function deployLockContract(
  params: LockParams,
  chain = "sepolia"
): Promise<LockContractState> {
  const { bytecode } = getContractArtifact();
  const splitRatio = params.template === "custom" && params.customSplitRatio
    ? params.customSplitRatio
    : SPLIT_RATIOS[params.template];

  console.log(`⛓️ Deploying ExChainLock on ${chain}...`);
  console.log(`   Party A: ${params.partyA} — ${params.amountA} USDC`);
  console.log(`   Party B: ${params.partyB} — ${params.amountB} USDC`);
  console.log(`   Duration: ${params.durationMonths} months`);
  console.log(`   Template: ${params.template} (split: ${splitRatio}bps)`);

  // Step 1: Estimate gas
  console.log("   ⏳ Estimating gas...");
  const gasEstimate = await oc.estimateGas(chain, "0x0000000000000000000000000000000000000000", bytecode);
  console.log(`   ✅ Gas estimate: ${gasEstimate.gasLimit} (${gasEstimate.totalCostUsd}$)`);

  // Step 2: Simulate transaction
  console.log("   ⏳ Simulating transaction...");
  const walletStatus = await oc.getWalletStatus();
  if (!walletStatus.loggedIn || !walletStatus.address) {
    throw new Error("Wallet not logged in. Run 'onchainos wallet login' first.");
  }
  const simulation = await oc.simulateTx(
    chain,
    walletStatus.address,
    "0x0000000000000000000000000000000000000000",
    bytecode
  );
  if (!simulation.success) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }
  console.log("   ✅ Simulation passed");

  // Step 3: Security scan
  console.log("   ⏳ Running security scan...");
  const securityScan = await oc.txScan(chain);
  if (securityScan.riskLevel === "danger") {
    throw new Error(`Security scan found dangerous issues: ${securityScan.issues.join(", ")}`);
  }
  if (securityScan.riskLevel === "warning") {
    console.log(`   ⚠️ Security warnings: ${securityScan.issues.join(", ")}`);
  } else {
    console.log("   ✅ Security scan passed");
  }

  // Step 4: Deploy
  console.log("   ⏳ Deploying contract...");
  const deployResult = await oc.walletContractCall(
    chain,
    "0x0000000000000000000000000000000000000000",
    bytecode
  );

  if (deployResult.status === "failed") {
    throw new Error(`Contract deployment failed: tx ${deployResult.hash}`);
  }

  console.log(`   ✅ Contract deployed! TX: ${deployResult.hash}`);

  // Construct initial state
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + params.durationMonths * 30 * 24 * 3600;

  return {
    address: deployResult.hash, // In production, derive contract address from tx receipt
    partyA: params.partyA,
    partyB: params.partyB,
    amountA: params.amountA,
    amountB: params.amountB,
    deadline,
    splitRatio,
    isActive: false,
    aDeposited: false,
    bDeposited: false,
  };
}

export async function depositUSDC(
  contractAddress: string,
  amount: number,
  chain = "sepolia"
): Promise<void> {
  console.log(`💰 Depositing ${amount} USDC to ${contractAddress}...`);

  // In production, this calls the deposit function on the contract
  // For MVP, use wallet send as approximation
  const result = await oc.walletSend(
    chain,
    contractAddress,
    String(amount),
    { contractToken: true }
  );

  console.log(`   ✅ Deposit TX: ${result.hash}`);
}
