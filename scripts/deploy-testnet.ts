/**
 * TASK-046 — Deploy CustodyLedger to Polygon Amoy (or another configured EVM
 * testnet). Mirrors deploy-local.ts but targets the `amoy` network
 * (hardhat.config.ts), whose RPC URL/private key come from `configVariable`
 * (AMOY_RPC_URL / AMOY_PRIVATE_KEY) — Hardhat refuses to run and reports
 * exactly which variable is missing if they aren't set, so no ad-hoc guard is
 * needed here (spec's "falla claro si faltan env").
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const NETWORK_NAME = "amoy";

const { ethers } = await network.create({ network: NETWORK_NAME });

const ledger = await ethers.deployContract("CustodyLedger");
await ledger.waitForDeployment();

const address = await ledger.getAddress();
const deployTx = ledger.deploymentTransaction();
const receipt = deployTx ? await deployTx.wait() : null;
if (!receipt) {
  throw new Error("CustodyLedger deployment transaction did not confirm");
}

const deployment = {
  network: NETWORK_NAME,
  address,
  blockNumber: receipt.blockNumber,
  deployedAt: new Date().toISOString(),
};

const outDir = join(REPO_ROOT, "deployments");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, `${NETWORK_NAME}.json`),
  `${JSON.stringify(deployment, null, 2)}\n`,
);

process.stdout.write(
  `CustodyLedger deployed to ${address} on ${NETWORK_NAME} (block ${deployment.blockNumber})\n`,
);
