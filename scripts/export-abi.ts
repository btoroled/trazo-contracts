/**
 * TASK-047 — Export the compiled CustodyLedger ABI for cross-repo distribution.
 *
 * Reads the Hardhat build artifact and emits `abi/CustodyLedger.json` (the raw
 * ABI array) plus `abi/CustodyLedger.meta.json` recording the source commit and
 * the canonical `CustodyEventRecorded` signature. The backend's `sync:contracts`
 * step (ADR-0012) copies these into `trazo-backend/contracts-artifacts/`.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const ARTIFACT_PATH = join(
  REPO_ROOT,
  "artifacts/contracts/CustodyLedger.sol/CustodyLedger.json",
);
const OUT_DIR = join(REPO_ROOT, "abi");

type AbiEventInput = { type: string; indexed?: boolean; name: string };
type AbiEntry = { type: string; name?: string; inputs?: AbiEventInput[] };

/** Canonical event signature used by the backend ABI-drift guard (enum -> uint8). */
function eventSignature(entry: AbiEntry): string {
  const inputs = (entry.inputs ?? []).map((input) => input.type).join(",");
  return `${entry.name}(${inputs})`;
}

function currentCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return "unknown";
  }
}

const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
  contractName: string;
  abi: AbiEntry[];
};

const custodyEvent = artifact.abi.find(
  (entry) => entry.type === "event" && entry.name === "CustodyEventRecorded",
);
if (!custodyEvent) {
  throw new Error(
    "CustodyEventRecorded event missing from compiled ABI — did the contract change?",
  );
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "CustodyLedger.json"),
  `${JSON.stringify(artifact.abi, null, 2)}\n`,
);
writeFileSync(
  join(OUT_DIR, "CustodyLedger.meta.json"),
  `${JSON.stringify(
    {
      contractName: artifact.contractName,
      sourceCommit: currentCommit(),
      custodyEventSignature: eventSignature(custodyEvent),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

process.stdout.write(
  `Exported ${artifact.contractName} ABI (${artifact.abi.length} entries) to ${OUT_DIR}\n`,
);
