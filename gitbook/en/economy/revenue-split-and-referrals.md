# Revenue split & referrals

Every fee that enters the game — mint, merge, pack — is split the same way, and a fixed **referral
fund** is carved out and paid to referrers. This page documents both, plus the secondary-market
royalty.

---

## The split

```solidity
// SpiritCards.sol
function _split(uint256 amount, address payer) internal {
    uint256 toReferral = (amount * config.referralBps()) / 10000; // 10%
    uint256 toPool     = (amount * config.poolBps())     / 10000; // 60%
    uint256 toHouse    = (amount * config.houseBps())    / 10000; // 30%
    uint256 toReserve  = amount - toReferral - toPool - toHouse;  // 0%
    ...
}
```

| Bucket | Share | Parameter | Purpose |
|---|---|---|---|
| **Staker pool** | **60%** | `poolBps = 6000` | Staker dividends (via `pumpPool()`) |
| **Referral fund** | **10%** | `referralBps = 1000` | Paid to referrers / master ref |
| **Treasury** | **30%** | `houseBps = 3000` | Team + marketing |
| **Reserve** | **0%** | `reserveBps = 0` | Unused; absorbs rounding |

`[proven]` — tunable via `setSplit` (must total 10000 bps).

---

## Where each split applies

| Fee source | Function | Split applied? |
|---|---|---|
| Mine (mint price) | `mine()` → `_split(due, miner)` | Yes |
| Merge fee | `mergeBurn()` → `_split(mergeFee, you)` | Yes |
| Pack purchase | `Packs.buyPack()` → `spc.collectRevenue{value}(buyer)` | Yes |
| PvP rake | `Battle._payRake()` | **No** — split 70% treasury / 30% pool (see below) |
| External to pool | `SpiritCards.addToPool()` | Feeds pool directly |

`[proven]`

The PvP rake uses its **own** split (`rakeToPoolBps`), because it is external battle revenue rather
than a mint fee. See [Battle → Lives, stakes & rake](../battle/lives-stakes-and-rake.md).

---

## The referral fund, step by step

The **10%** referral fund is **not** simply handed to "a referrer." It is divided into a **master-ref
cut** and a **personal-referrer cut**. This is described here transparently.

Inside `_split`, when `toReferral > 0`: `[proven]`

1. **Master ref (fixed upline):** takes `masterRefBps` of **gross** — default **3%** (`300 bps`) —
   from **every** payer, regardless of who referred them.
   ```
   toMaster = min(amount × masterRefBps / 10000, toReferral)
   ```
   (`min` guards against the cut exceeding the referral fund if retuned.)
2. **Personal referrer:** gets the **remainder of the referral fund** — i.e. **7%** of gross by
   default — credited to the payer's referrer.
3. **No referrer?** The 7% is **not** paid out; it stays in the referral pool
   (`accruedReferral − referralOutstanding`) for a later sweep.

So of the 10% fund: **3% → master ref, 7% → the payer's own referrer.** `[proven]`

> [!NOTE]
> If `masterRef` is not set to an address, the master cut is skipped and the referrer receives the
> **entire 10%**. On the current deployment the master ref is the deployer. `[proven]`

### Illustration

A player pays a `0.00037 ETH` mint fee:

| Recipient | Calculation | Amount |
|---|---|---|
| Master ref | 3% of gross | 0.0000111 ETH |
| Personal referrer | 7% of gross | 0.0000259 ETH |
| Staker pool | 60% | 0.000222 ETH |
| Treasury | 30% | 0.000111 ETH |

`[assumed]` — arithmetic follows directly from the defaults above.

---

## Setting a referrer

- A user can set a referrer **once** (`referrerOf[user]` is immutable after being set). `[proven]`
- The referrer must have **already minted at least one card** (`_balanceOf[ref] > 0`), preventing
  sybil referrer chains with no stake in the game. `[proven]`
- You cannot refer yourself, and the referrer cannot be the zero address. `[proven]`

```solidity
function setReferrer(address ref) external {
    require(referrerOf[msg.sender] == address(0), "SET");
    require(ref != msg.sender, "SELF");
    require(ref != address(0), "ZERO");
    require(_balanceOf[ref] > 0, "REF_NO_MINT");
    referrerOf[msg.sender] = ref;
}
```

Emits `ReferrerSet(user, referrer)`.

---

## Claiming referral earnings

Referral earnings accrue in `referralEarned[referrer]`. To withdraw:

```solidity
function claimReferral() external nonReentrant {
    uint256 v = referralEarned[msg.sender];
    require(v > 0, "NOTHING");
    referralEarned[msg.sender] = 0;
    referralOutstanding -= v;
    accruedReferral -= v;
    ...
    emit ReferralClaimed(msg.sender, v);
}
```

`[proven]`

Protections:

- **`referralOutstanding`** tracks the sum of all unclaimed referral earnings. It is subtracted so the
  owner's sweep cannot touch what is owed. `[proven]`
- **`withdrawReferralLeftover`** (owner) can only sweep the **surplus** — the part of the referral fund
  with no recipient (e.g. the 7% from payers who have no referrer). It never touches
  `referralOutstanding`. `[proven]`

---

## Treasury and pool withdrawal

| Function | Who | Effect |
|---|---|---|
| `withdrawHouse(to)` | owner | Sweeps accrued treasury (30% bucket) |
| `withdrawReserve(to)` | owner | Sweeps accrued reserve (currently 0) |
| `withdrawPool(to)` | owner | Manual pool withdrawal (normally use `pumpPool`) |
| `pumpPool()` | **anyone** | Pushes the pool to the vault as dividends |

`[proven]`

---

## Secondary-market royalty (ERC-2981)

`SpiritCards` implements **ERC-2981**. When a card is resold on a marketplace that honours the
standard (e.g. OpenSea), a royalty is paid to the treasury: `[proven]`

```solidity
function royaltyInfo(uint256, uint256 salePrice)
    external view returns (address receiver, uint256 royaltyAmount)
{
    receiver = config.treasury();
    royaltyAmount = (salePrice * config.royaltyBps()) / 10000; // 5%
}
```

| Parameter | Value |
|---|---|
| `royaltyBps` | **500** (5%) |
| Receiver | `config.treasury()` |

Royalties are not enforced on-chain; they rely on the marketplace honouring ERC-2981.

---

## Compliance framing

The referral system is described **neutrally and transparently**: the master-ref cut exists and is
disclosed, not hidden. In marketing to the China-facing community: `[assumed — policy, not code]`

- No promised returns or "earn X% by referring."
- Referral is presented as a **fee share from real activity**, not an investment.
- No investment language; no under-18; odds disclosed for packs.

See the [Legal disclaimer](../project/legal-disclaimer.md).

---

## Reading it on-chain

```solidity
config.poolBps()  config.referralBps()  config.houseBps()  config.reserveBps()
config.masterRefBps()
spc.referrerOf(user)
spc.referralEarned(user)
spc.accruedReferral()  spc.referralOutstanding()
spc.accruedPool()  spc.accruedHouse()  spc.accruedReserve()
spc.masterRef()
```

`[proven]`

---

## Next

- **[Staking & rewards](staking-and-rewards.md)**
- **[Battle → Lives, stakes & rake](../battle/lives-stakes-and-rake.md)**
- **[Economy overview](README.md)**
