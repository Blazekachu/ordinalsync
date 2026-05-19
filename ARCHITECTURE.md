# OrdinalSync — Architecture

Trustless tokenization of Bitcoin ordinals, runes, and rare sats on Starknet, with no custody. Bitcoin remains the source of truth; Starknet verifies proofs and mints synthetic representations.

---

## 1. Design Principles

- **Data lives on Bitcoin, always.** Inscriptions never leave the user's Bitcoin wallet.
- **No custody.** No federation, no multisig, no wrapped asset.
- **UTXO = truth.** Bitcoin's own model enforces ownership.
- **Starknet verifies, doesn't trust.** Block headers and merkle proofs are checked on-chain in Cairo.
- **Auto-invalidation.** Synthetics freeze the moment the L1 UTXO moves without an authorized recommit.
- **Complete coverage.** Ordinals, runes, and rare sats — every sat is indexed.

---

## 2. System Architecture

```
BITCOIN L1 (source of truth)
+---------------------------------------------------------------+
|                                                               |
|  Ordinals        Runes           Commit/Recommit TXs          |
|  (witness)       (OP_RETURN)     (OP_RETURN: STRK|T/R/X)      |
|                                                               |
|  Data source: ord indexer + custom OP_RETURN parser           |
+---------------------------------------------------------------+
                            |
                            | Proofs submitted by auto-relayer
                            v
STARKNET L2 (verification + synthetic layer)
+---------------------------------------------------------------+
|                                                               |
|  HeaderChainVerifier    OrdinalRegistry    SyntheticOrdinals  |
|  (ZeroSync-based)       (Cairo)            (ERC-721)          |
|                                                               |
|  RareSatRegistry        SyntheticRunes     Auto-Relayer       |
|  (Cairo)                (ERC-20)           (submits proofs)   |
|                                                               |
+---------------------------------------------------------------+
                            |
                            v
USER LAYER
+---------------------------------------------------------------+
|                                                               |
|  Explorer UI         Tokenize App       Trade/DeFi            |
|                                                               |
+---------------------------------------------------------------+
```

### Components

1. **Bitcoin Indexer** — `ord` + custom OP_RETURN parser for STRK protocol messages
2. **Auto-Relayer** — Watches tokenized UTXOs, auto-submits proofs to Starknet
3. **Header Chain Verifier** — Cairo contract (ZeroSync-based) verifying Bitcoin block headers
4. **Ordinal Registry** — Cairo contract: inscription_id → commit status, UTXO, owner
5. **Rare Sat Registry** — Tracks sat rarity (vintage, pizza, block 9, uncommon, rare, epic, legendary, mythic)
6. **Rune Registry** — Rune ID → supply, holders, commit status
7. **Synthetic Token Contracts** — ERC-721 (ordinals) + ERC-20 (runes) on Starknet
8. **Frontend** — Explorer + tokenization app + marketplace

---

## 3. Commit-Reveal Protocol

### OP_RETURN Message Format

| Action | Format | Purpose |
|--------|--------|---------|
| `T` | `STRK\|T\|<inscription_id>\|<starknet_addr>` | First-time tokenize |
| `R` | `STRK\|R\|<inscription_id>\|<new_utxo>` | Recommit (UTXO resize, same owner) |
| `X` | `STRK\|X\|<inscription_id>` | Voluntary release (un-tokenize) |
| `RT` | `STRK\|RT\|<rune_id>\|<amount>\|<starknet_addr>` | Rune tokenize (amount-based) |

Prefix `STRK` (4 bytes), separator `|`. All formats fit within Bitcoin's 80-byte OP_RETURN limit.

### Protocol Rules

| Rule | Description |
|------|-------------|
| One inscription = one synthetic | Can't tokenize same inscription twice. First valid commit wins. |
| Commit TX must spend from same address | At least one input must be from the address that controls the inscription UTXO. Proves ownership. |
| Recommit must be in same TX as UTXO change | If UTXO changes + no recommit in same TX = invalidation. No grace period. |
| Release is voluntary | Owner can burn their synthetic anytime by broadcasting `STRK\|X`. |
| Rune tokenize is partial | You can tokenize 500 of your 10,000 runes. Amount-based, not all-or-nothing. |

### Inscription ID vs UTXO

```
INSCRIPTION ID (permanent, never changes):
  abc675...i0
  - Set at birth (reveal TX ID + index)
  - Never changes regardless of transfers
  - This is the asset identifier

UTXO (changes every transfer):
  - Inscription sat lives in a UTXO (~330 sats, dust limit)
  - When inscription transfers, old UTXO spent, new UTXO created
  - Same inscription, same sat, different UTXO, potentially different owner
  - UTXO being spent = ownership MAY have changed
```

### State Machine (per inscription)

```
                    +---------+
                    |  IDLE   | (not tokenized)
                    +----+----+
                         | STRK|T commit TX confirmed
                         v
                    +---------+
              +---->|  ACTIVE | (synthetic minted, tradeable)
              |     +----+----+
              |          |
              |    +-----+------------------+
              |    |                         |
              |    v                         v
              | UTXO spent              STRK|X broadcast
              | + no STRK|R             (voluntary release)
              | in same TX                   |
              |    |                         |
              |    v                         v
              | +----------+          +---------+
              | |INVALIDATED|          |  IDLE   |
              | |(frozen)   |          +---------+
              | +-----+----+
              |       | New owner does STRK|T
              |       v
              |  +---------+
              +--|  ACTIVE  | (new synthetic, old one dead forever)
                 +----------+

   UTXO spent + STRK|R in same TX:
         -> ACTIVE (same synthetic, UTXO pointer updated)
```

---

## 4. Verification Flow

### Proof Package (submitted to Starknet)

```
1. Bitcoin Block Header (hash, prev_hash, merkle_root, nonce, timestamp)
2. Merkle Path (proof that commit TX is in that block)
3. Raw Commit TX (inputs, outputs, OP_RETURN data)
4. Ownership Proof (input address matches inscription UTXO owner)
```

### Cairo Verification Steps

1. **Header chain check** — Is this block header part of the longest chain? (ZeroSync confirms.)
2. **TX inclusion** — Does the merkle path hash up to the block's merkle root?
3. **Parse OP_RETURN** — Extract action, inscription_id, starknet_address.
4. **Ownership validation** — Verify the TX input address controls the inscription UTXO.
5. **State update** — Update registry → mint/freeze/update synthetic.

### Invalidation (UTXO Spent Proof)

```
Proof contains:
  - The TX that spent the UTXO (raw transaction)
  - Merkle proof of that TX in a valid block
  - Block header (verified against header chain)

Cairo contract verifies:
  - TX is real (merkle proof valid)
  - TX input references the committed UTXO
  - No STRK|R recommit in that TX's outputs
  -> INVALIDATE synthetic
```

---

## 5. Auto-Relayer

The system runs its own indexer and already sees every Bitcoin block in real time. The auto-relayer eliminates the wait for a human to notice an L1 state change and submit a proof.

```
On every new Bitcoin block:
  1. Scan: any tokenized inscription's UTXO spent this block?
  2. Check: was there a STRK|R recommit in that TX?
     - YES -> submit recommit proof to Starknet (update pointer)
     - NO  -> submit spent-proof to Starknet (invalidate)
  3. Starknet contract verifies proof on-chain (still trustless)

Latency: ~10 minutes (1 Bitcoin block) + seconds (Starknet confirmation)
```

### Permissionless Fallback

The auto-relayer is the primary mechanism, but the Starknet contract accepts proofs from any address. This guarantees:

- No single point of failure (relayer down? anyone can submit)
- No trust required in the relayer (proofs are always verified on-chain)
- Decentralized by design

---

## 6. Indexer Architecture

| Data Type | Source | What We Store |
|-----------|--------|---------------|
| Inscriptions | ord indexer | ID, content_type, content_hash, sat_number, current_UTXO, owner_address |
| Runes | ord indexer | rune_id, name, symbol, supply, divisibility, holder_balances |
| Rare Sats | ordinal theory | sat_number, rarity_type, current_UTXO, owner |
| Commit TXs | OP_RETURN parser | inscription_id, action, starknet_addr, block_height |
| UTXO State | bitcoind | which tokenized UTXOs are spent/unspent |

Services exposed:

- **Explorer API** — public, anyone can query Bitcoin ordinals/runes/sats state
- **Proof Generator** — creates merkle proofs for users wanting to tokenize
- **Auto-Relayer** — watches tokenized UTXOs, auto-submits to Starknet

---

## 7. Starknet Contracts (Cairo)

### `HeaderChainVerifier`

```
Based on ZeroSync. Verifies Bitcoin block headers on Starknet.

  verify_block_header(header) -> bool
  verify_tx_inclusion(tx_hash, merkle_proof, block_header) -> bool
  get_chain_tip() -> block_height
```

### `OrdinalRegistry`

```
Core contract. Maps inscription state.

  tokenize(proof_package) -> token_id
  recommit(proof_package) -> bool
  invalidate(spent_proof) -> bool
  release(inscription_id) -> bool
  get_status(inscription_id) -> Status

Storage per inscription:
  inscription_id -> {
    owner_starknet: ContractAddress,
    btc_utxo: felt252,
    commit_block: u64,
    status: Active | Invalidated | Idle,
    synthetic_token_id: u256
  }
```

### `SyntheticOrdinals` (ERC-721)

```
NFT contract for tokenized inscriptions.

  mint(to, inscription_metadata) -> token_id
  freeze(token_id)          // called on invalidation
  burn(token_id)            // called on release
  transfer (BLOCKED if frozen)

Metadata stored on-chain:
  inscription_id, content_type, content_hash, sat_number, rarity
```

### `SyntheticRunes` (ERC-20)

```
Fungible token for tokenized runes.

  mint(to, amount)
  freeze_balance(holder, amount)
  burn(holder, amount)
  Partial tokenization (amount-based)
```

### `RareSatRegistry`

```
Tracks all rare sat classifications.

  register_rare_sat(sat_number, rarity_proof) -> bool
  get_rarity(sat_number) -> RarityType
  list_by_rarity(type) -> Array<sat_number>

Rarity types:
  common, uncommon, rare, epic, legendary, mythic
  Special: vintage, pizza, block9, nakamoto, first_tx
```

---

## 8. User Flows

### A. Tokenize an Inscription

1. User connects Bitcoin wallet (Xverse) + Starknet wallet (ArgentX/Braavos)
2. App shows user's inscriptions (from indexer API)
3. User picks an inscription, clicks **Tokenize**
4. App builds Bitcoin TX:
   - Input: UTXO from same address holding the inscription
   - Output: `OP_RETURN STRK|T|<inscription_id>|<starknet_addr>`
   - Output: change back to user
5. User signs in Xverse, broadcasts
6. Wait for 1–3 Bitcoin confirmations
7. App generates proof package (header + merkle path + raw TX)
8. App submits proof to `OrdinalRegistry` on Starknet
9. Contract verifies → mints Synthetic NFT to user's Starknet wallet
10. Synthetic is tradeable on Starknet

### B. Resize UTXO (Same Owner)

1. User clicks **Manage UTXO**, chooses to add/remove padding sats
2. App auto-includes `OP_RETURN STRK|R|<inscription_id>|<new_utxo>`
3. Single TX: spend old UTXO + create new UTXO + recommit
4. After confirmation, auto-relayer submits recommit proof
5. Registry updates UTXO pointer; synthetic stays alive

### C. Auto-Invalidation (Inscription Sold on L1)

1. Owner sells inscription on any Bitcoin marketplace
2. UTXO is spent, no `STRK|R` in that TX
3. Auto-relayer detects in next Bitcoin block (~10 min)
4. Auto-relayer submits spent-proof to Starknet
5. `OrdinalRegistry` verifies proof → freezes synthetic
6. Synthetic shows: **INVALIDATED — ownership moved on L1**
7. All trades/DeFi activity halted for this token

### D. Re-Tokenize (New Owner)

1. New owner connects wallets to app
2. App shows: *Inscription #5000 — INVALIDATED (available to re-tokenize)*
3. New owner clicks **Tokenize**
4. Same as Flow A — new commit TX, new proof, new synthetic minted
5. Old synthetic stays dead forever (historical record on Starknet)

### E. Voluntary Release

1. Owner wants to un-tokenize (maybe to sell clean on Bitcoin)
2. Broadcasts TX with `OP_RETURN STRK|X|<inscription_id>`
3. Auto-relayer picks up, submits to Starknet
4. Synthetic burned; inscription back to IDLE state

---

## 9. DeFi Layer (What Synthetics Enable)

### Marketplace

- Buy/sell synthetic ordinals for strkBTC
- Instant settlement (Starknet speed, ~seconds)
- Private trades via STRK20 shielded mode
- On-chain royalties (Cairo contract enforced)

### Lending

- Deposit synthetic ordinal as collateral
- Borrow strkBTC against it
- If inscription invalidated on L1 → automatic liquidation
- Price oracle: floor price from marketplace trades

### Fractionalization

- Split one rare inscription synthetic into N shares (ERC-20)
- Shares tradeable independently
- Governance over the original (e.g., set list price)

### Rune DeFi

- Synthetic runes in LP pools on Ekubo
- Rune / strkBTC trading pairs
- Yield farming with rune tokens

---

## 10. Tech Stack

| Layer | Technology |
|-------|-----------|
| Bitcoin node | `bitcoind` + `ord` indexer |
| OP_RETURN parsing | TypeScript (custom parser) |
| Auto-relayer | TypeScript (watches UTXOs, submits Starknet TXs) |
| Starknet contracts | Cairo 2.18 |
| Header verification | ZeroSync (Cairo) |
| Testing | snforge 0.44, vitest |
| Frontend | Next.js 16, React 19, starknet-react v8 |
| Bitcoin wallet | Xverse |
| Starknet wallet | ArgentX (Ready) / Braavos |
| Deployment | starkli 0.4.2, Starknet Sepolia → mainnet |

---

## See Also

- [`SECURITY.md`](./SECURITY.md) — security model, attack analysis, covenant roadmap
- [`PROPOSAL.md`](./PROPOSAL.md) — Starknet grant application
- [`README.md`](./README.md) — quick start and demo
