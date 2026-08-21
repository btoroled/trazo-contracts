import { expect } from "chai";
import { network } from "hardhat";
import type { EventLog } from "ethers";

const { ethers } = await network.create();

// Mirror of the on-chain enum ordinals (ADR-0008). The backend maps its
// CustodyEventType against these same values; a drift here breaks reconstruction.
const EventType = {
  MANIFEST_UPLOADED: 0,
  VALIDATED: 1,
  CUSTOMS_APPROVED: 2,
  CUSTOMS_REJECTED: 3,
  PHYSICAL_RECEIVED: 4,
  RELEASED: 5,
} as const;

const hashShipmentId = (shipmentId: string) =>
  ethers.keccak256(ethers.toUtf8Bytes(shipmentId));

const documentHash = (seed: string) =>
  ethers.keccak256(ethers.toUtf8Bytes(seed));

async function deployLedger() {
  return ethers.deployContract("CustodyLedger");
}

describe("CustodyLedger", function () {
  it("records a custody event and emits CustodyEventRecorded with the expected args", async function () {
    const ledger = await deployLedger();
    const [actor] = await ethers.getSigners();

    const shipmentId = "3f9a1c2e-uuid-shipment-1";
    const shipmentIdHash = hashShipmentId(shipmentId);
    const docHash = documentHash("manifest.pdf");

    await expect(
      ledger.recordEvent(
        shipmentIdHash,
        shipmentId,
        EventType.MANIFEST_UPLOADED,
        docHash,
      ),
    )
      .to.emit(ledger, "CustodyEventRecorded")
      .withArgs(
        shipmentIdHash,
        EventType.MANIFEST_UPLOADED,
        actor.address,
        (timestamp: bigint) => timestamp > 0n,
        docHash,
        shipmentId,
      );
  });

  it("reconstructs a shipment's history in order from the logs", async function () {
    const ledger = await deployLedger();

    const shipmentId = "shipment-order";
    const shipmentIdHash = hashShipmentId(shipmentId);
    const sequence = [
      EventType.MANIFEST_UPLOADED,
      EventType.VALIDATED,
      EventType.CUSTOMS_APPROVED,
      EventType.PHYSICAL_RECEIVED,
      EventType.RELEASED,
    ];

    for (const eventType of sequence) {
      await ledger.recordEvent(
        shipmentIdHash,
        shipmentId,
        eventType,
        documentHash(`doc-${eventType}`),
      );
    }

    const filter = ledger.filters.CustodyEventRecorded(shipmentIdHash);
    const logs = (await ledger.queryFilter(filter)) as EventLog[];

    expect(logs.map((log) => Number(log.args.eventType))).to.deep.equal(
      sequence,
    );
    expect(logs.every((log) => log.args.shipmentId === shipmentId)).to.equal(
      true,
    );
  });

  it("isolates history per shipment via the indexed shipmentIdHash", async function () {
    const ledger = await deployLedger();

    const shipmentA = "shipment-a";
    const shipmentB = "shipment-b";
    const hashA = hashShipmentId(shipmentA);
    const hashB = hashShipmentId(shipmentB);

    await ledger.recordEvent(
      hashA,
      shipmentA,
      EventType.MANIFEST_UPLOADED,
      documentHash("a1"),
    );
    await ledger.recordEvent(
      hashB,
      shipmentB,
      EventType.MANIFEST_UPLOADED,
      documentHash("b1"),
    );
    await ledger.recordEvent(
      hashA,
      shipmentA,
      EventType.VALIDATED,
      documentHash("a2"),
    );

    const logsA = (await ledger.queryFilter(
      ledger.filters.CustodyEventRecorded(hashA),
    )) as EventLog[];

    expect(logsA).to.have.lengthOf(2);
    expect(logsA.every((log) => log.args.shipmentId === shipmentA)).to.equal(
      true,
    );
  });

  it("supports filtering by a specific event type", async function () {
    const ledger = await deployLedger();

    const shipmentId = "shipment-typed";
    const shipmentIdHash = hashShipmentId(shipmentId);

    await ledger.recordEvent(
      shipmentIdHash,
      shipmentId,
      EventType.MANIFEST_UPLOADED,
      documentHash("m"),
    );
    await ledger.recordEvent(
      shipmentIdHash,
      shipmentId,
      EventType.CUSTOMS_REJECTED,
      documentHash("r"),
    );
    await ledger.recordEvent(
      shipmentIdHash,
      shipmentId,
      EventType.CUSTOMS_APPROVED,
      documentHash("a"),
    );

    const rejected = (await ledger.queryFilter(
      ledger.filters.CustodyEventRecorded(
        undefined,
        EventType.CUSTOMS_REJECTED,
      ),
    )) as EventLog[];

    expect(rejected).to.have.lengthOf(1);
    expect(Number(rejected[0].args.eventType)).to.equal(
      EventType.CUSTOMS_REJECTED,
    );
  });

  it("emits monotonic non-decreasing timestamps", async function () {
    const ledger = await deployLedger();

    const shipmentId = "shipment-time";
    const shipmentIdHash = hashShipmentId(shipmentId);

    for (let i = 0; i < 4; i++) {
      await ledger.recordEvent(
        shipmentIdHash,
        shipmentId,
        EventType.VALIDATED,
        documentHash(`t-${i}`),
      );
    }

    const logs = (await ledger.queryFilter(
      ledger.filters.CustodyEventRecorded(shipmentIdHash),
    )) as EventLog[];
    const timestamps = logs.map((log) => log.args.timestamp as bigint);

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).to.be.gte(timestamps[i - 1]);
    }
  });

  it("rejects an out-of-range event type", async function () {
    const ledger = await deployLedger();
    const shipmentId = "shipment-bad";
    const shipmentIdHash = hashShipmentId(shipmentId);

    // 6 is past RELEASED (5): the ABI enum decoding must reject it.
    await expect(
      ledger.recordEvent(shipmentIdHash, shipmentId, 6, documentHash("x")),
    ).to.be.revert(ethers);
  });
});
