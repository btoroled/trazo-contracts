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

## Redes

- `hardhat`: red EVM efímera usada por las pruebas.
- `localhost`: nodo iniciado por `pnpm node`, en `http://127.0.0.1:8545`.
- `amoy`: placeholder de Polygon Amoy configurado exclusivamente mediante
  `AMOY_RPC_URL` y `AMOY_PRIVATE_KEY`.

Copia `.env.example` a `.env` solo si vas a usar Amoy. Nunca publiques una clave
privada real ni reutilices una cuenta de producción.
