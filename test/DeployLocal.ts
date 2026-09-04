import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { network } from "hardhat";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const DEPLOYMENT_PATH = join(REPO_ROOT, "deployments", "hardhat.json");

/**
 * TASK-045 — runs the real deploy-local script against the dev stack's
 * Hardhat node (docker compose up hardhat) and checks it produced a valid
 * deployments/hardhat.json pointing at a contract with code on-chain.
 *
 * deployments/hardhat.json is a committed artifact (the backend reads it for
 * the contract address, ADR-0012). This suite snapshots it before the real
 * deploy overwrites it and restores it afterwards, so `pnpm test` never
 * leaves the working tree dirty.
 */
describe("deploy-local script", function () {
  this.timeout(30_000);

  let deploymentSnapshot: string | null = null;

  before(() => {
    deploymentSnapshot = existsSync(DEPLOYMENT_PATH)
      ? readFileSync(DEPLOYMENT_PATH, "utf8")
      : null;
    rmSync(DEPLOYMENT_PATH, { force: true });
    execFileSync(
      "npx",
      ["hardhat", "run", "scripts/deploy-local.ts", "--network", "localhost"],
      { cwd: REPO_ROOT, stdio: "pipe" },
    );
  });

  after(() => {
    if (deploymentSnapshot === null) {
      rmSync(DEPLOYMENT_PATH, { force: true });
    } else {
      writeFileSync(DEPLOYMENT_PATH, deploymentSnapshot);
    }
  });

  it("writes deployments/hardhat.json with a valid shape", () => {
    expect(existsSync(DEPLOYMENT_PATH)).to.equal(true);
    const deployment = JSON.parse(readFileSync(DEPLOYMENT_PATH, "utf8")) as {
      network: string;
      address: string;
      blockNumber: number;
      deployedAt: string;
    };

    expect(deployment.network).to.equal("localhost");
    expect(deployment.address).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(deployment.blockNumber).to.be.a("number").greaterThan(0);
    expect(new Date(deployment.deployedAt).toString()).to.not.equal(
      "Invalid Date",
    );
  });

  it("deploys a contract with code at the recorded address", async () => {
    const deployment = JSON.parse(readFileSync(DEPLOYMENT_PATH, "utf8")) as {
      address: string;
    };
    const { ethers } = await network.create({ network: "localhost" });
    const code = await ethers.provider.getCode(deployment.address);
    expect(code).to.not.equal("0x");
  });
});
