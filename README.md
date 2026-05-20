# OrdinalSync

**Trustless Bitcoin ordinals, runes, and rare sats on Starknet — no custody, no bridges, no trust.**

Inscriptions stay in your Bitcoin wallet. A commit TX on Bitcoin (`OP_RETURN STRK|T|...`) plus on-chain proof verification in Cairo mints a synthetic ERC-721 on Starknet. Sell the inscription on Bitcoin and the synthetic auto-invalidates within one block.

> Status: **Phase 1 PoC complete.** 3 contracts deployed on Starknet Sepolia. 34 tests passing. End-to-end tokenize demo working.

---

## Why It Matters

Bitcoin ordinals, runes, and rare sats are a $2B+ market locked on a chain with 10-minute blocks, no smart contracts, and no DeFi. Existing "bridges" all require custody, federation, or trust. There is no trustless way to bring **specific** Bitcoin assets to any L2.

strkBTC handles fungible BTC on Starknet. OrdinalSync handles the rest — specific sats, specific inscriptions, specific runes — via UTXO-anchored commit-reveal proofs.

---

## Live on Sepolia

| Contract | Address |
|---|---|
| HeaderVerifier | [`0x005d0973...23d8c0`](https://sepolia.starkscan.co/contract/0x005d0973e5743cccc7caf9c4d605d0d44a836060a841e92dd6f2e62b0c23d8c0) |
| OrdinalRegistry | [`0x026ef729...013c221`](https://sepolia.starkscan.co/contract/0x026ef72983ef55e111915e0f82b491f1f7a329cdad646a3842435b1e4013c221) |
| SyntheticOrdinals | [`0x03af96a7...fe5fbf6`](https://sepolia.starkscan.co/contract/0x03af96a76fbdbb00c00f2b062b24082c3559d685f3da3e1ea360b2986fe5fbf6) |

The registry now performs a real cross-contract ERC-721 mint on tokenize (and freeze/burn on invalidate/release).

---

## How It Works

```
BITCOIN L1                          STARKNET L2
+-------------------+               +---------------------+
|  Inscription      |               |  HeaderVerifier     |
|  in user's UTXO   |               |  OrdinalRegistry    |
|                   |  proof pkg    |  SyntheticOrdinals  |
|  OP_RETURN  ----->|  (header +    |                     |
|  STRK|T|id|addr   |   merkle      |  verify → mint NFT  |
|                   |   path + tx)  |                     |
+-------------------+               +---------------------+
        ^                                    |
        | UTXO spent w/o STRK|R              |
        +------- auto-relayer ---------------+
                 (~10 min: freeze synthetic)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

---

## Repository Layout

```
ordinalsync/
├── contracts/       Cairo smart contracts (Scarb / snforge)
├── indexer/         Bitcoin OP_RETURN parser + merkle proof generator + relayer + REST API
├── frontend/        Next.js explorer + tokenize app (starknet-react, ArgentX/Braavos)
├── ARCHITECTURE.md  Full protocol design
├── SECURITY.md      Security model, attack analysis, covenant roadmap
└── PROPOSAL.md      Starknet grant application
```

---

## Quick Start

### Contracts (Cairo 2.18)

```bash
cd contracts
scarb build
snforge test       # 13 tests
```

Requires Scarb 2.18.0 + snforge 0.44.0.

### Indexer (Node.js)

```bash
cd indexer
npm install
npm test           # 21 tests
npm run dev        # REST API on :3001
```

### Frontend (Next.js 16)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

---

## Try the Demo

1. Start the indexer: `cd indexer && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Register a mock tokenized inscription:
   ```bash
   curl -X POST http://localhost:3001/api/tokenized \
     -H "Content-Type: application/json" \
     -d '{"inscriptionId":"abc123i0","btcUtxo":"xyz789:0","ownerAddress":"bc1q...","starknetAddress":"0x04...","commitTxId":"deadbeef","commitBlockHeight":850000,"status":"active"}'
   ```
4. View at <http://localhost:3000>
5. Trigger invalidation:
   ```bash
   curl -X PATCH http://localhost:3001/api/tokenized/abc123i0 \
     -H "Content-Type: application/json" \
     -d '{"status":"invalidated"}'
   ```

---

## Protocol At a Glance

| Action | OP_RETURN | Effect |
|---|---|---|
| Tokenize | `STRK\|T\|<inscription>\|<starknet_addr>` | Mints synthetic NFT on Starknet |
| Recommit | `STRK\|R\|<inscription>\|<new_utxo>` | Updates UTXO pointer (same owner, UTXO resize) |
| Release | `STRK\|X\|<inscription>` | Burns synthetic, returns to IDLE |
| Rune tokenize | `STRK\|RT\|<rune>\|<amount>\|<addr>` | Partial rune tokenization |

State machine: `IDLE → ACTIVE → (INVALIDATED | IDLE)`. Re-tokenization permitted after invalidation.

---

## Tests

- **Cairo:** 13 tests — merkle proof verification, header chain, registry state machine, NFT freeze/unfreeze
- **TypeScript:** 21 tests — OP_RETURN parser, merkle proof generator, relayer UTXO-spend detection, end-to-end

---

## What's Phase 1 vs Phase 2

**Phase 1 (this repo):** Working tokenize flow on Sepolia. Trusted header verifier and keccak-based merkle (PoC shortcuts, clearly marked in source).

**Phase 2:** ZeroSync-based trustless header chain verification (real PoW + sha256d), real Bitcoin TX construction via `scure-btc-signer`, Xverse integration, production relayer connected to a live Bitcoin testnet4 node.

**Phase 3:** Collateral bonds, mempool monitoring, covenant-based trustless locking (OP_CTV / OP_CAT / OP_VAULT when available).

See [`SECURITY.md`](./SECURITY.md) for the full security roadmap and threat model, and [`PROPOSAL.md`](./PROPOSAL.md) for the grant application detailing Phase 2 deliverables.

---

## License

[MIT](./LICENSE)
