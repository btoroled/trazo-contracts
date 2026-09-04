# trazo-contracts

Smart contracts de ChainLock para Trazo. El proyecto usa Hardhat 3, Solidity,
ethers y TypeChain con pnpm.

## Requisitos

- Node.js 22 o superior
- pnpm 11

## Inicio rápido

```bash
pnpm install
pnpm compile
pnpm test
pnpm node
```

`pnpm compile` genera los artefactos y tipos de TypeChain. Para probar un deploy
local, deja `pnpm node` ejecutándose en otra terminal y usa `pnpm deploy:local`.

## Contrato `CustodyLedger`

Ledger inmutable de la cadena de custodia (ChainLock). Registra eventos mínimos
como logs indexados; la historia de un `shipment` se reconstruye **solo desde el
ledger** vía `queryFilter` ([ADR-0008](../Trazo/docs/architecture/adr/ADR-0008-onchain-event-format.md)).
No se almacena PII on-chain: únicamente un hash de documento y metadatos mínimos.

**Evento**

```solidity
event CustodyEventRecorded(
    bytes32 indexed shipmentIdHash, // keccak256 del UUID del shipment
    EventType indexed eventType,    // tipo de evento (enum, ver ordinales)
    address actor,                  // msg.sender que registró el evento
    uint256 timestamp,              // block.timestamp
    bytes32 documentHash,           // hash del documento (nunca el documento)
    string  shipmentId              // UUID en claro, solo para legibilidad
);
```

**Ordinales de `EventType`** (parte del contrato de ABI; el backend mapea su
`CustodyEventType` contra estos valores — el orden nunca cambia, solo se añade):

| Ordinal | EventType           |
| ------- | ------------------- |
| 0       | `MANIFEST_UPLOADED` |
| 1       | `VALIDATED`         |
| 2       | `CUSTOMS_APPROVED`  |
| 3       | `CUSTOMS_REJECTED`  |
| 4       | `PHYSICAL_RECEIVED` |
| 5       | `RELEASED`          |

**Función:** `recordEvent(bytes32 shipmentIdHash, string shipmentId, EventType eventType, bytes32 documentHash)`
— emite `CustodyEventRecorded` usando `msg.sender` y `block.timestamp`. El
contrato no guarda storage por evento; solo emite.

## Redes

- `hardhat`: red EVM efímera usada por las pruebas.
- `localhost`: nodo iniciado por `pnpm node`, en `http://127.0.0.1:8545`.
- `amoy`: placeholder de Polygon Amoy configurado exclusivamente mediante
  `AMOY_RPC_URL` y `AMOY_PRIVATE_KEY`.

Copia `.env.example` a `.env` solo si vas a usar Amoy. Nunca publiques una clave
privada real ni reutilices una cuenta de producción.

## Deploy

- **Local:** deja `pnpm node` corriendo (o `docker compose up hardhat` desde
  `trazo-backend`) y ejecuta `pnpm deploy:local`. Escribe
  `deployments/hardhat.json` (address/block/red) — es el artefacto que lee
  `pnpm sync:contracts` en el backend (ADR-0012).
- **Testnet (Amoy):** define `AMOY_RPC_URL` y `AMOY_PRIVATE_KEY` en `.env`
  (nunca los commitees) y corre `pnpm deploy:testnet`. Si falta cualquiera de
  las dos variables, Hardhat aborta con un error explícito indicando cuál
  falta — no hay guard adicional necesario. Escribe `deployments/amoy.json`.
  - RPC: usa un proveedor gratuito (p.ej. Alchemy/Infura Amoy) o el RPC
    público de Polygon.
  - Gas: la cuenta de `AMOY_PRIVATE_KEY` necesita MATIC de prueba — obténlo
    del [faucet oficial de Polygon Amoy](https://faucet.polygon.technology/).
  - `deployments/amoy.json` sí se commitea una vez hecho el deploy real
    (mismo patrón que `hardhat.json`), pero nunca la clave privada.
