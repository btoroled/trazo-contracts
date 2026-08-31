/**
 * TASK-045 — Deploy CustodyLedger to the local Hardhat node (docker/hardhat,
 * CHAIN_RPC_URL) and record where it landed. The backend's ChainClient
 * (TASK-050) and sync step (ADR-0012, TASK-047) read this file for the
 * address; `blockNumber` lets the backend bound its log-reconstruction scan.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../..");

const { ethers } = await network.create({ network: "localhost" });

const ledger = await ethers.deployContract("CustodyLedger");
await ledger.waitForDeployment();

const address = await ledger.getAddress();
const deployTx = ledger.deploymentTransaction();
const receipt = deployTx ? await deployTx.wait() : null;
if (!receipt) {
  throw new Error("CustodyLedger deployment transaction did not confirm");
}

const deployment = {
  network: "localhost",
  address,
  blockNumber: receipt.blockNumber,
  deployedAt: new Date().toISOString(),
};

const outDir = join(REPO_ROOT, "deployments");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "hardhat.json"),
  `${JSON.stringify(deployment, null, 2)}\n`,
);

process.stdout.write(
  `CustodyLedger deployed to ${address} (block ${deployment.blockNumber})\n`,
);
