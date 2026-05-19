# OrdinalSync — Security Model

OrdinalSync is non-custodial: inscriptions stay in the user's Bitcoin wallet at all times. That design choice has direct security consequences. This document is the honest accounting.

---

## 1. The Core Tradeoff

The tokenizer always retains the ability to spend the UTXO on Bitcoin. If they sell the synthetic on Starknet and then move the inscription on Bitcoin, the synthetic buyer loses unless invalidation reaches Starknet first.

This is the fundamental tradeoff of non-custodial cross-chain synthetics. Every system faces a variant of it:

- **Lightning** solves it with HTLCs (time-locked atomic swaps)
- **Custodial bridges** solve it by locking the asset (custody risk + federation trust)
- **RGB** solves it with client-side validation (off-chain only)
- **OrdinalSync** solves it via Bitcoin-anchored proofs + an auto-invalidation race, with a phased mitigation roadmap toward Bitcoin-enforced locking when covenants activate

---

## 2. Double-Spend Attack Window

When a tokenized inscription moves on Bitcoin without a recommit (`STRK|R`), there is a window between the Bitcoin TX broadcast and Starknet invalidation:

| Relayer mode | Window |
|---|---|
| Confirmed blocks only | ~10 minutes (1 Bitcoin block) |
| Mempool + blocks | ~5 seconds |
| Mempool + instant freeze | Synthetic frozen within seconds of broadcast |

The window is the attack surface. Everything below is about closing it.

---

## 3. Mitigation Strategy (Phased)

### Phase 1 — PoC (current)

- Auto-relayer monitors confirmed Bitcoin blocks
- Permissionless fallback: anyone can submit a spent-proof
- Frontend pre-warns: compares current Bitcoin owner (from ordinals.com) against the tokenization owner; flags mismatch immediately even before the relayer processes it

Trust assumption: synthetic buyer trusts the tokenizer for ~10 minutes per L1 movement window.

### Phase 2 — Economic + Speed Mitigations

**Collateral bond.** Tokenizers must lock a strkBTC bond in `OrdinalRegistry`. If the inscription moves on Bitcoin without proper release (`STRK|X`), the bond is slashed and transferred to the current synthetic holder. Double-spending becomes economically irrational — the attacker loses their bond.

**Mempool monitoring.** Auto-relayer watches the Bitcoin mempool in addition to confirmed blocks. Any mempool TX spending a tokenized UTXO without `STRK|R` triggers an instant freeze on Starknet, dropping the attack window from ~10 minutes to ~5 seconds.

**L1 owner mismatch detection** (already in PoC frontend). Compares the current Bitcoin owner against the tokenization record; flags synthetics as invalid before the auto-relayer processes them.

### Phase 3 — Bitcoin Covenant Opcodes (trustless locking)

When Bitcoin activates covenant opcodes, OrdinalSync upgrades to trustless UTXO locking. We've analyzed 15 proposed covenant opcodes; the three most relevant:

- **OP_CTV (BIP 119)** — closest to activation. Locks the UTXO to a template that can only spend to a recommit or release address. The holder physically cannot move the inscription any other way.
- **OP_CAT (BIP 347)** — most general-purpose. Enables arbitrary spending conditions like "UTXO can only be spent if the spending TX contains `OP_RETURN STRK|R` or `STRK|X`."
- **OP_VAULT (BIP 345)** — time-delayed exit with instant recovery path. The inscription holder must wait N blocks to move it, giving the auto-relayer time to react.

This eliminates the trust assumption entirely. No bonds, no mempool monitoring races, just Bitcoin-enforced rules.

---

## 4. Security Roadmap Summary

| Phase | Mechanism | Attack Window | Trust Assumption |
|-------|-----------|---------------|------------------|
| PoC (now) | Auto-relayer on confirmed blocks | ~10 min | Synthetic buyer trusts tokenizer |
| Phase 2 | + Mempool monitoring | ~5 sec | Reduced by speed |
| Phase 2 | + Collateral bond | Economically unprofitable | Bond ≥ synthetic value |
| Phase 3 | + OP_CTV / OP_CAT covenant locking | Zero | Trustless (Bitcoin enforced) |

---

## 5. Out-of-Scope Threats (Not Addressed by This Design)

Honest disclosure of what this design does **not** protect against:

- **Bitcoin chain reorgs.** Header chain verification accepts the longest valid chain. A deep reorg could orphan a commit TX. Mitigation: require N confirmations (3–6) before accepting a tokenize proof.
- **Starknet sequencer censorship.** If Starknet refuses to include an invalidation proof, the synthetic stays falsely active. Permissionless fallback mitigates but doesn't eliminate.
- **Off-chain content disputes.** Inscription content is referenced by hash; if `ordinals.com` or the indexer disagrees with the user about content_type or sat_number metadata, the synthetic still tokenizes but UI may show stale info.
- **Wallet compromise.** Standard wallet-security risks apply to both Bitcoin and Starknet sides.

---

## 6. Reporting a Vulnerability

If you discover a security issue, please disclose responsibly. Open a GitHub issue marked `[security]` for non-critical findings, or contact the maintainers privately for anything that could lead to fund loss or false invalidation.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full protocol design.
