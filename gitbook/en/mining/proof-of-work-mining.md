# Proof-of-work mining

This page is the exact technical description of how a Spirit Card is mined and minted. Everything
here is verifiable in `SpiritCards.sol`.

---

## 1. The work function

```solidity
function workFor(address miner, uint256 nonce) public view returns (bytes32) {
    return keccak256(abi.encodePacked(block.chainid, address(this), miner, nonce));
}
```

The work for a given `(miner, nonce)` is the `keccak256` of the packed bytes:

```
chainId (uint256) ‖ SpiritCards address (20 bytes) ‖ miner (20 bytes) ‖ nonce (uint256)
```

Because `chainId` and the contract address are baked in, a nonce valid for one contract cannot be
replayed on another. `[proven]`

---

## 2. The validity condition

```solidity
function leadingZeroBits(bytes32 w) public pure returns (uint256) {
    uint256 x = uint256(w);
    if (x == 0) return 256;
    uint256 count = 0;
    uint256 mask = 1 << 255;
    while ((x & mask) == 0) { count += 1; mask >>= 1; }
    return count;
}
```

A nonce is **valid** when:

```
leadingZeroBits(workFor(miner, nonce)) ≥ requiredBits()
```

`[proven]`

### Expected hashes

Each hash is uniform, so the expected number of tries to get `k` leading zero bits is `2^k`.

| `requiredBits` | Expected hashes | ≈ at 1 MH/s |
|---|---|---|
| 20 (era 0–3) | 1,048,576 | ~1 s |
| 21 (era 4–6) | 2,097,152 | ~2 s |
| 22 (era 7) | 4,194,304 | ~4 s |

`[proven]` for the difficulty; `[assumed]` for the wall-clock estimate (device-dependent).

---

## 3. The full mint check

`mine(nonce, useChip)` executes these guards, in order: `[proven]`

```
1.  !config.paused()                              // game not paused
2.  totalMinted + 1 ≤ config.maxSupply()          // supply not sold out
3.  roll epoch if epochLength elapsed
4.  epochMinted < config.epochCap()               // per-epoch cap
5.  now ≥ lastMintAt[you] + config.mineCooldown()  // per-wallet cooldown
6.  leadingZeroBits(work) ≥ requiredBits()        // PROOF OF WORK
7.  !nonceUsed[you][nonce]                         // nonce is one-time
8.  msg.value == due                               // exact price (chip discount applied)
```

Guards 6 and 7 together mean: **each `(miner, nonce)` pair mints at most one card**, and only if the
nonce actually satisfies the difficulty at that moment.

> [!NOTE]
> "One-time per nonce" also means a nonce you found while difficulty was low cannot be "banked" and
> replayed after difficulty rises — a nonce is consumed on first successful mint, and a fresh one must
> satisfy the *current* `requiredBits`.

---

## 4. The seed (what your card becomes)

Immediately after a successful mint, the card's seed is written:

```solidity
seedOf[id] = keccak256(abi.encodePacked(block.prevrandao, msg.sender, nonce, id));
```

Inputs:

| Input | Source |
|---|---|
| `block.prevrandao` | The RANDAO value of the mint block |
| `msg.sender` | Your address |
| `nonce` | The nonce you mined |
| `id` | The new token ID (`totalMinted`, in `1 … 8888`) |

`[proven]`

Everything the card *is* — rarity, HP/ATK/DEF, element, skill, art — is a pure function of this seed
(see [Creatures, elements & rarity](../introduction/creatures-elements-and-rarity.md)).

> [!TIP]
> Because `block.prevrandao` is part of the seed, the exact card you receive is **not fully known
> until your mint transaction lands in a block**. A miner can mine a valid nonce, but the *traits*
> depend on the block the transaction is included in.

---

## 5. Post-mint accounting

After a successful mint the contract updates: `[proven]`

| State | Change |
|---|---|
| `nonceUsed[miner][nonce]` | `= true` |
| `lastMintAt[miner]` | `= block.timestamp` |
| `epochMinted` | `+= 1` |
| `totalMinted` | `+= 1` |
| `paidMinted` | `+= 1` (drives price & difficulty eras) |
| chip balance | `+1` if full price, `−1` if a chip was used |
| `points[miner]` | `+= pointsMine` (default 1) |

and emits:

```solidity
event Mined(address indexed miner, uint256 indexed tokenId, uint256 nonce,
            bytes32 work, uint256 bits, uint256 paid);
```

`[proven]`

---

## 6. Verifying from outside

Given a `Mined` event you can fully re-derive the card:

```
work  = keccak256(chainId ‖ SpiritCards ‖ miner ‖ nonce)   // must equal event.work
seed  = keccak256(block.prevrandao_of_mint_block ‖ miner ‖ nonce ‖ tokenId)
stats = profileOf(tokenId)                                 // reads seedOf on-chain
```

`[proven]`

---

## 7. Mining in the browser and CLI

The web app ships a PoW engine that runs in the background while you use the app. A separate **CLI
miner** (`miner/`) produces a `work` byte-for-byte identical to the on-chain `Mined` event, for
farm-style mining. See [How to mint](how-to-mint.md).

---

## Next

- **[How to mint](how-to-mint.md)** — practical steps and error codes
- **[Difficulty & network pace](difficulty-and-network-pace.md)** — the difficulty curve
