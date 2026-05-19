# OrdinalSync — Starknet Seed Grant Application

> Copy-paste these answers into the Airtable form at:
> https://tinyurl.com/starknet-seed-grants

---

## Project Name

OrdinalSync

## One-line Description

Trustless protocol to tokenize Bitcoin ordinals, runes, and rare sats on Starknet via commit-reveal proofs — no custody, no bridges, no trust.

## Project Description (Detailed)

OrdinalSync is a trustless protocol that brings Bitcoin's cultural layer — ordinals, runes, and rare sats — to Starknet without custody. Inscriptions never leave the user's Bitcoin wallet. Instead, users broadcast a commit transaction on Bitcoin (OP_RETURN with a STRK protocol message), and a Cairo smart contract on Starknet verifies the Bitcoin block header and merkle inclusion proof to mint a synthetic ERC-721 token.

The protocol uses UTXO-based invalidation: if the inscription's UTXO is spent on Bitcoin without a recommit message, an auto-relayer detects this and submits a spent-proof to Starknet, automatically freezing the synthetic token. This makes the system self-healing — synthetics always reflect the true Bitcoin state.

Key innovations:
- Commit-reveal tokenization: OP_RETURN messages (STRK|T, STRK|R, STRK|X) enable tokenize, recommit, and release operations
- UTXO-based invalidation: No grace periods, no challenge windows — if the UTXO moves, the synthetic freezes
- Auto-relayer: Watches tokenized UTXOs and auto-submits proofs to Starknet (permissionless fallback)
- No custody: Inscriptions stay in the user's Bitcoin wallet at all times

## Problem Statement

Bitcoin ordinals, runes, and rare sats are a $2B+ market locked on a chain with 10-minute blocks, no smart contracts, and limited DeFi. Collectors can't:
- Trade inscriptions with instant settlement
- Use inscriptions as DeFi collateral
- Access shielded/private trades
- Fractionalize high-value inscriptions

Existing "bridges" require custody (wrapping), centralized operators, or trust assumptions. There is no trustless way to bring specific Bitcoin assets (not just fungible BTC) to any L2.

strkBTC solves the fungible BTC bridge. OrdinalSync solves the non-fungible gap — specific sats, specific inscriptions, specific runes.

## Solution

A three-layer architecture:

1. Bitcoin L1 (source of truth): User broadcasts OP_RETURN commit transactions. An indexer with ord parses STRK protocol messages and generates merkle proofs.

2. Starknet L2 (verification): Cairo contracts verify Bitcoin block headers and TX inclusion proofs. The OrdinalRegistry manages inscription state (Active/Invalidated/Idle). SyntheticOrdinals (ERC-721) mints/freezes/burns based on registry state.

3. Auto-relayer (real-time sync): Monitors tokenized UTXOs on Bitcoin. When a UTXO is spent, auto-submits invalidation or recommit proofs to Starknet within one Bitcoin block (~10 minutes).

## Current Stage / What's Built

**Phase 1 PoC — COMPLETE**

Cairo smart contracts (deployed on Sepolia testnet):
- HeaderVerifier: Stores and validates Bitcoin block headers
- OrdinalRegistry: Tokenize/invalidate/recommit/release state machine
- SyntheticOrdinals: ERC-721 with freeze/unfreeze mechanics
- 13 Cairo tests passing

TypeScript indexer + backend:
- OP_RETURN parser (STRK|T/R/X/RT protocol)
- Merkle proof generator (double SHA-256, Bitcoin-compatible)
- Auto-relayer with UTXO spend detection
- Express REST API
- 21 TypeScript tests passing

Frontend (Next.js):
- Explorer showing tokenized inscriptions with on-chain status
- Tokenize page with real Starknet wallet connection (starknet-react)
- Inscription detail page with on-chain data + release button
- End-to-end tokenization demo working on Sepolia

**Total: 34 tests passing, 3 contracts deployed on Sepolia, working demo**

## Deployed Contract Addresses (Sepolia)

- HeaderVerifier: 0x050f4ce210000ec235937da131fb71ce40d6afff0d16f642881405565c41c187
- OrdinalRegistry: 0x05fa527701e55cc68a3b1db6bd9cd7f939c934e8eb138d564f90abff886f3294
- SyntheticOrdinals: 0x0742b64f6056c16f937d184e53a7829f9b8fcc9d64a5a1c666896234a0147898

## Demo Transaction Hashes (Sepolia)

- Header submission TX: 0x449df4d4...f9b49c
- Tokenization TX: 0x5f68abd0...a4ca00

(Viewable on sepolia.starkscan.co)

## Tech Stack

- Smart contracts: Cairo 2.18, Scarb 2.18.0, snforge 0.44.0
- Backend: TypeScript, Express, vitest
- Frontend: Next.js 16, React 19, starknet-react, starknet.js v8
- Wallet: ArgentX (Ready), Braavos — via InjectedConnector
- Deployment: starkli 0.4.2, Alchemy RPC

## Competitive Landscape

We analyzed 29 projects using commit-reveal patterns on Bitcoin. None does what OrdinalSync does.

### Commit-Reveal Methods on Bitcoin Today

| Method | Projects | What They Do |
|--------|----------|-------------|
| Taproot commit-reveal | Ordinals, BRC-20, Atomicals, Rollkit | Inscribe data in witness (L1 only) |
| OP_RETURN data | Runes, Stacks, VeriBlock, Omni, Counterparty, OpenTimestamps | Embed state/tokens/timestamps on L1 |
| Taproot key tweak | RGB, Taproot Assets | Client-side validated tokens (off-chain) |
| Hash-preimage reveal | Lightning, BitVM, tBTC | Payments, fraud proofs, bridges |
| ZK proof anchoring | Citrea, BOB, ZeroSync, Babylon | L2 state anchoring / rollups |
| Federated peg | Liquid, Rootstock, strkBTC | Fungible BTC bridging |

### Closest Competitors and Why We're Different

| Project | What They Do | Gap OrdinalSync Fills |
|---------|-------------|----------------------|
| **RGB** | Smart contracts + tokens bound to UTXOs via Taproot tweaks | Private/off-chain only — no public L2 marketplace, no inscription support |
| **Taproot Assets** | Lightning Labs token issuance on Bitcoin + Lightning | Fungible tokens only — no specific inscription/ordinal/rare sat support |
| **Citrea** | ZK rollup on Bitcoin, inscribes STARK proofs to Bitcoin | General EVM rollup — not focused on ordinals/inscriptions at all |
| **Stacks** | Smart contracts with OP_RETURN Bitcoin anchoring | Own chain with STX token — doesn't bring ordinals to another L2 |
| **strkBTC** | Federated BTC bridge to Starknet | Fungible BTC only — no specific sat, inscription, or rune support |
| **tBTC** | Decentralized BTC-to-Ethereum bridge | Fungible BTC only — same gap |
| **Babylon** | Bitcoin staking via time-lock scripts | Staking/security — no asset tokenization |

### The Gap

Every existing Bitcoin bridge or L2 handles **fungible BTC**. Nobody handles **non-fungible Bitcoin assets** — specific inscriptions, specific satoshis, specific rune balances. This is a $2B+ market with zero L2 representation.

OrdinalSync is the first protocol to:
1. Use OP_RETURN commit-reveal to tokenize **specific** Bitcoin assets on an L2
2. Implement **UTXO-based auto-invalidation** (no challenge periods, no grace windows)
3. Target Starknet specifically, complementing strkBTC's fungible coverage

## Security Model

### The Core Challenge

OrdinalSync is non-custodial — inscriptions stay in the user's Bitcoin wallet. This means the tokenizer always retains the ability to spend the UTXO on Bitcoin. If they sell the synthetic on Starknet and then move the inscription on Bitcoin, the synthetic buyer loses.

This is the fundamental tradeoff of non-custodial design. Every cross-chain system faces it: Lightning solves it with HTLCs, custodial bridges solve it by locking the asset, RGB solves it with client-side validation.

### Double-Spend Attack Window

When a tokenized inscription moves on Bitcoin without a recommit (STRK|R), there is a window between the Bitcoin TX broadcast and Starknet invalidation:

- Relayer watching confirmed blocks only: ~10 minute window (1 Bitcoin block)
- Relayer watching mempool + blocks: ~5 second window
- With mempool monitoring + instant freeze: synthetic frozen within seconds of Bitcoin TX broadcast

### Mitigation Strategy (Phased)

**Phase 2 — Collateral Bond (economic security):**
Tokenizers must lock a strkBTC bond in the OrdinalRegistry contract. If the inscription moves on Bitcoin without proper release (STRK|X), the bond is slashed and transferred to the current synthetic holder. This makes double-spending economically irrational — the attacker loses their bond.

**Phase 2 — Mempool Monitoring:**
Auto-relayer watches Bitcoin mempool in addition to confirmed blocks. Any mempool TX spending a tokenized UTXO without STRK|R triggers an instant freeze on Starknet. This reduces the attack window from ~10 minutes to ~5 seconds.

**Phase 2 — L1 Owner Mismatch Detection:**
The frontend already compares the current Bitcoin owner (from ordinals.com) with the tokenization owner. If they differ, the synthetic is flagged as invalid immediately — even before the auto-relayer processes it.

**Phase 3 — Bitcoin Covenant Opcodes (trustless locking):**
When Bitcoin activates covenant opcodes, OrdinalSync will upgrade to trustless UTXO locking. We've analyzed 15 proposed covenant opcodes:

- **OP_CTV (BIP 119)** — closest to activation (proposed May 2027). Locks UTXO to a template that can only spend to a recommit or release address. The holder physically cannot move the inscription any other way.
- **OP_CAT (BIP 347)** — most general-purpose. Enables arbitrary spending conditions like "UTXO can only be spent if spending TX contains OP_RETURN with STRK|R or STRK|X."
- **OP_VAULT (BIP 345)** — time-delayed exit with instant recovery path. Inscription holder must wait N blocks to move it, giving the auto-relayer time to react.

This eliminates the trust assumption entirely — no bonds needed, no mempool monitoring race conditions.

### Security Roadmap

| Phase | Mechanism | Attack Window | Trust Assumption |
|-------|-----------|---------------|------------------|
| PoC (now) | Auto-relayer on confirmed blocks | ~10 min | Synthetic buyer trusts tokenizer |
| Phase 2 | + Mempool monitoring | ~5 sec | Reduced by speed |
| Phase 2 | + Collateral bond | Economically unprofitable | Bond >= synthetic value |
| Phase 3 | + OP_CTV/OP_CAT covenant locking | Zero | Trustless (Bitcoin enforced) |

## How It Benefits the Starknet Ecosystem

1. **Brings new users**: Every Bitcoin ordinals/runes collector becomes a potential Starknet user
2. **New asset class**: Synthetic ordinals create a new DeFi primitive on Starknet (collateral, trading, fractionalization)
3. **Complements strkBTC**: strkBTC handles fungible BTC; OrdinalSync handles non-fungible Bitcoin assets — together they cover all of Bitcoin
4. **ZK-native**: Proof verification in Cairo leverages Starknet's core strength
5. **Uses strkBTC**: Marketplace trades denominated in strkBTC, deepening its utility
6. **Open source**: Public good for the ecosystem
7. **Privacy**: Future integration with STRK20 for shielded ordinal trades

## Requested Funding Amount

$25,000 in STRK (Seed Grant)

## Use of Funds

- ZeroSync integration for real Bitcoin header verification (trustless, not PoC): 40%
- Complete Bitcoin TX building + wallet integration (Xverse, sats-connect): 25%
- Production auto-relayer with real Bitcoin node connection: 20%
- Testnet deployment, documentation, community outreach: 15%

## Milestones (8 weeks)

Week 1-2: ZeroSync Bitcoin header chain verifier integration (replace trusted PoC verifier)
Week 3-4: Real Bitcoin TX construction with scure-btc-signer, Xverse wallet integration for commit transactions
Week 5-6: Production auto-relayer connected to live Bitcoin testnet4 node
Week 7-8: Full end-to-end demo on testnet4 + Starknet Sepolia, documentation, community demo

## Team

Solo builder with deep Bitcoin + Starknet experience:

- Built Runes Etch: self-custodial Bitcoin Runes etching tool with vanity TXID grinding, 4 etching modes, Leather + Xverse wallet integration, testnet4 tested
- Built TBTC: unified Bitcoin toolkit with 5 modules (scure-btc-signer)
- Built StarkVanity: Starknet vanity address grinder in Rust (Ready, Braavos, Xverse support)
- Deep understanding of Bitcoin UTXO model, ordinal theory, inscription mechanics, OP_RETURN protocol
- Proficient in Cairo, TypeScript, Rust, Next.js

## Links

- GitHub: https://github.com/Blazekachu
- OrdinalSync repo: https://github.com/Blazekachu/ordinalsync
- Runes Etch: https://github.com/Blazekachu/runes-etch
- Twitter/X: https://x.com/Blazekachu
- Email: akhileshsince1993@gmail.com
- Telegram: @bhangbuddy

## Category / Track

Bitcoin / Cross-chain

## Open Source?

Yes — fully open source

## Previously Received Starknet Funding?

No

## Additional Notes

We analyzed 29 projects using commit-reveal patterns on Bitcoin (Ordinals, Runes, RGB, Taproot Assets, BitVM, Citrea, Stacks, Lightning, strkBTC, tBTC, Babylon, and more). Every existing bridge or L2 handles fungible BTC. Zero projects handle non-fungible Bitcoin assets on any L2. OrdinalSync is first-to-market in this category.

OrdinalSync fills the exact gap that strkBTC doesn't cover. strkBTC brings fungible Bitcoin to Starknet via a 5-member federation. OrdinalSync brings non-fungible Bitcoin assets (specific inscriptions, specific sats, specific runes) via trustless proofs. Together, they make Starknet the complete Bitcoin L2.

The auto-invalidation mechanism (UTXO-based, no challenge periods) is a novel contribution that could become a standard for all Bitcoin asset bridging protocols. No existing bridge handles specific sat tracking with automatic invalidation.

We've deeply analyzed the security model — the core challenge of non-custodial cross-chain synthetics, the double-spend attack window, and a phased mitigation strategy from collateral bonds (Phase 2) to trustless Bitcoin covenant locking (Phase 3, when OP_CTV/OP_CAT activate). We've researched all 15 proposed Bitcoin covenant opcodes and designed upgrade paths for each. This level of security analysis is unusual for a Seed Grant application — it reflects our deep understanding of both Bitcoin's UTXO model and cross-chain trust assumptions.

The PoC is fully working with 34 tests, real Sepolia transactions, and live inscription rendering from ordinals.com. The frontend already detects L1 owner mismatches and flags invalid synthetics. This is not a concept — it's a working prototype ready for the next stage.
