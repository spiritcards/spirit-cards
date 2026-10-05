# Merge & forging (熔 MERGE)

Merging is the card **evolution** mechanic: you **burn two cards** and receive **one forged card**.
It reduces the live base supply (two base cards out, one card back in a separate namespace) and is one
of the game's deflationary pressures.

> [!NOTE]
> A merge is **not guaranteed** to produce a child. There is a small, tunable chance (default **7%**)
> that the merge is a **dud**: both cards burn and no card is minted. This is an intentional
> **anti-arbitrage** feature.

---

## The call

```solidity
function mergeBurn(uint256 a, uint256 b) external payable nonReentrant {
    require(!config.paused(), "PAUSED");
    require(a != b, "SAME");
    require(_ownerOf[a] == msg.sender && _ownerOf[b] == msg.sender, "NOT_OWNER");
    require(msg.value == config.mergeFee(), "BAD_FEE");
    ...
}
```

Guards: `[proven]` the two cards must be **different**, **both owned by you**, and you must pay exactly
the **merge fee**.

| Parameter | Value |
|---|---|
| `mergeFee` | **0.00002 ETH** |
| `mergeFailBps` | **700** (7%) |

---

## What happens step by step

1. A merge seed is computed:
   ```
   s = keccak256(seedOf[a], seedOf[b], block.prevrandao, msg.sender)
   ```
2. Both cards `a` and `b` are **burned**; `burned += 2`. `[proven]`
3. A **dud roll** is taken:
   ```
   roll = keccak256(s, "DUD") % 10000
   ```
   - If `roll < mergeFailBps` → **DUD**: no child is minted. The merge fee is still split to the
     revenue buckets, and `Merged(a, b, 0, fee)` is emitted with child id **0** (the dud marker). `[proven]`
   - Otherwise → a **forged child** is minted.
4. The child gets id `10,000,000 + forgeCounter` (a separate namespace from base `1…8888`), with
   `seedOf[child] = s`. `forged += 1`. `[proven]`
5. The merge fee is split through the standard revenue path. `[proven]`
6. **+2 activity points** (if the child was minted). `[proven]`

```solidity
event Merged(uint256 indexed a, uint256 indexed b, uint256 indexed child, uint256 fee);
```

`child == 0` signals a dud.

---

## The "dud" and why it exists

Without a failure chance, merging could be an **arbitrage**: if one higher-level card is worth more
than two cards of the previous level, a player could buy two cards and merge **forever at a
profit**, draining value from the system. The dud closes that loop: a 7% chance of losing both inputs
makes the expected value of a naive merge-churn **negative** for an arbitrageur, while honest
players still merge for the evolution/lore.

- `mergeFailBps = 700` → **7% dud** by default.
- Setting it to `0` disables duds entirely (owner can retune). `[proven]`

`[assumed]` — the anti-arbitrage rationale is the documented design intent.

---

## Level and stats of a merged card

The **Level** (and any stat uplift for evolution) is derived **off-chain from the child's seed** — the
contract stores only the seed. That means: `[proven]`

- The child **is** a normal card from the game's perspective; its traits come from `seedOf[child]`
  exactly like a mined card.
- Anything that reads stats (the UI, the battle profile) will work on a merged card identically.
- The child can itself be merged again later.

---

## Supply effects

| Event | Base supply (`totalMinted`) | Live base cards | Forged |
|---|---|---|---|
| Merge success | unchanged | −2 | +1 |
| Merge dud | unchanged | −2 | 0 |

- `totalMinted` / `paidMinted` (and therefore price & difficulty eras) do **not** move on a merge —
  only `mine` and `mintPack` advance the base mint count. `[proven]`
- Forged cards live in a **separate namespace**, so "8888 base" is a fixed ceiling even as forging
  creates new tokens. `[proven]`

---

## Costs and points

| Item | Value |
|---|---|
| Merge fee | 0.00002 ETH (split pool/ref/treasury) |
| Points | +2 (on a successful child) |
| Dud chance | 7% |

`[proven]`

---

## Reading it on-chain

```solidity
spc.seedOf(a)      // input card A seed
spc.seedOf(b)      // input card B seed
spc.forged()       // total forged children
// Merged(a, b, child, fee)   child == 0  →  dud
```

`[proven]`

---

## Next

- **[Revenue split & referrals](revenue-split-and-referrals.md)**
- **[The collection](../introduction/the-collection.md)** — supply namespaces
