// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CustodyLedger — immutable chain-of-custody ledger for Trazo (ChainLock).
/// @notice Records minimal custody events as indexed logs so a shipment's full
///         history is reconstructable from the ledger alone (ADR-0008). No PII
///         is ever stored on-chain: only a document hash and minimal metadata.
/// @dev The contract keeps no per-event storage; it only emits events. History
///      is read off-chain via `queryFilter` on the indexed `shipmentIdHash`.
contract CustodyLedger {
    /// @notice Fixed vocabulary of custody event types. Ordinals are part of the
    ///         public ABI contract: the backend maps CustodyEventType against
    ///         these values, so ordering must never change (only append).
    enum EventType {
        MANIFEST_UPLOADED,
        VALIDATED,
        CUSTOMS_APPROVED,
        CUSTOMS_REJECTED,
        PHYSICAL_RECEIVED,
        RELEASED
    }

    /// @notice Emitted for every recorded custody event.
    /// @param shipmentIdHash keccak256 of the shipment UUID string (indexed for per-shipment queries).
    /// @param eventType the custody event type (indexed for per-type queries).
    /// @param actor the address that submitted the event (`msg.sender`).
    /// @param timestamp block timestamp when the event was recorded.
    /// @param documentHash SHA-256/keccak hash of the related document (never the document itself).
    /// @param shipmentId the raw shipment UUID string, kept in data for readability.
    event CustodyEventRecorded(
        bytes32 indexed shipmentIdHash,
        EventType indexed eventType,
        address actor,
        uint256 timestamp,
        bytes32 documentHash,
        string shipmentId
    );

    /// @notice Record a custody event on the immutable ledger.
    /// @param shipmentIdHash keccak256 of the shipment UUID string.
    /// @param shipmentId the raw shipment UUID string (for human-readable logs).
    /// @param eventType the custody event type; out-of-range values revert on decode.
    /// @param documentHash hash of the related document, or bytes32(0) when none.
    function recordEvent(
        bytes32 shipmentIdHash,
        string calldata shipmentId,
        EventType eventType,
        bytes32 documentHash
    ) external {
        emit CustodyEventRecorded(
            shipmentIdHash,
            eventType,
            msg.sender,
            block.timestamp,
            documentHash,
            shipmentId
        );
    }
}
