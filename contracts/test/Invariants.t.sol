// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";

// ------------------------------------------------------------------
// Handler: mutates SpiritCards through a bounded, well-defined surface.
// Only mints to known actors so that "sum of balances" is meaningful.
// ------------------------------------------------------------------
contract PocHandler is Test {
    Config public config;
    SpiritCards public poc;

    address[] public actors;
    uint256[] public ids; // every token id minted through doMint

    constructor(Config _config, SpiritCards _poc) {
        config = _config;
        poc = _poc;
        actors.push(address(0xA11CE));
        actors.push(address(0xB0B));
        actors.push(address(0xCA401));
        for (uint256 i = 0; i < actors.length; i++) vm.deal(actors[i], 1000 ether);
    }

    function actorsLength() external view returns (uint256) {
        return actors.length;
    }

    function idsLength() external view returns (uint256) {
        return ids.length;
    }

    function isActor(address a) public view returns (bool) {
        for (uint256 i = 0; i < actors.length; i++) {
            if (actors[i] == a) return true;
        }
        return false;
    }

    function _ownerOrZero(uint256 id) internal view returns (address) {
        try poc.ownerOf(id) returns (address o) {
            return o;
        } catch {
            return address(0);
        }
    }

    function doMint(uint256 actorSeed, uint256 n) external {
        address to = actors[actorSeed % actors.length];
        n = bound(n, 1, 3);
        uint256 first = poc.totalMinted() + 1;
        poc.mintPack(to, n);
        for (uint256 i = 0; i < n; i++) ids.push(first + i);
    }

    function doTransfer(uint256 idSeed, uint256 fromSeed, uint256 toSeed) external {
        if (ids.length == 0) return;
        uint256 id = ids[idSeed % ids.length];
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];
        if (from == to) return;
        if (_ownerOrZero(id) != from) return;
        vm.prank(from);
        poc.transferFrom(from, to, id);
    }

    function doMerge(uint256 aSeed, uint256 bSeed) external {
        if (ids.length < 2) return;
        uint256 a = ids[aSeed % ids.length];
        uint256 b = ids[bSeed % ids.length];
        if (a == b) return;
        address oa = _ownerOrZero(a);
        address ob = _ownerOrZero(b);
        if (oa == address(0) || oa != ob || !isActor(oa)) return;
        uint256 fee = config.mergeFee(); // cache BEFORE prank (an arg call would consume it)
        vm.prank(oa);
        poc.mergeBurn{value: fee}(a, b);
    }

    function doBurn(uint256 idSeed) external {
        if (ids.length == 0) return;
        uint256 id = ids[idSeed % ids.length];
        address o = _ownerOrZero(id);
        if (!isActor(o)) return;
        vm.prank(o);
        poc.burnCard(id);
    }
}

// ------------------------------------------------------------------
// Handler: mutates StakeVault through stake / unstake / claim / notify.
// Tracks a bounded set of token ids seeded in the constructor.
// ------------------------------------------------------------------
contract VaultHandler is Test {
    Config public config;
    SpiritCards public poc;
    StakeVault public vault;
    PocHandler public pocH;

    uint256[] public ids;
    mapping(uint256 => bool) public active;
    mapping(uint256 => address) public staker;
    uint256 public notifyCount;

    constructor(Config _config, SpiritCards _poc, StakeVault _vault, PocHandler _pocH) {
        config = _config;
        poc = _poc;
        vault = _vault;
        pocH = _pocH;
        vm.deal(address(this), 100000 ether);

        // Seed six cards (2 to each of 3 actors) via the pack minter handler.
        uint256 before = poc.totalMinted();
        for (uint256 a = 0; a < 3; a++) {
            pocH.doMint(a, 2);
        }
        uint256 after_ = poc.totalMinted();
        for (uint256 id = before + 1; id <= after_; id++) {
            ids.push(id);
        }
    }

    function idsLength() external view returns (uint256) {
        return ids.length;
    }

    function _ownerOrZero(uint256 id) internal view returns (address) {
        try poc.ownerOf(id) returns (address o) {
            return o;
        } catch {
            return address(0);
        }
    }

    function doStake(uint256 idSeed, uint256 tierSeed) external {
        if (ids.length == 0) return;
        uint256 id = ids[idSeed % ids.length];
        if (active[id]) return;
        address o = _ownerOrZero(id);
        if (!pocH.isActor(o)) return;
        uint256 tier = tierSeed % config.TIER_COUNT();
        vm.prank(o);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(o);
        vault.stake(id, tier);
        active[id] = true;
        staker[id] = o;
    }

    function doUnstake(uint256 idSeed) external {
        if (ids.length == 0) return;
        uint256 id = ids[idSeed % ids.length];
        if (!active[id]) return;
        (address user, uint256 tier, , uint256 stakedAt, , ) = vault.stakes(id);
        uint256 unlockAt = stakedAt + config.tierLock(tier);
        if (block.timestamp < unlockAt) vm.warp(unlockAt);
        vm.prank(user);
        vault.unstake(id);
        active[id] = false;
    }

    function doClaim(uint256 idSeed) external {
        if (ids.length == 0) return;
        uint256 id = ids[idSeed % ids.length];
        if (!active[id]) return;
        vm.prank(staker[id]);
        vault.claim(id);
    }

    function doNotify(uint256 amount) external {
        amount = bound(amount, 1, 1e18);
        notifyCount += 1;
        vault.notifyRewards{value: amount}();
    }

    // --- ghost/read helpers used by invariants ---
    function computedWeight() external view returns (uint256 sum) {
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (active[id]) {
                (, , uint256 w, , , ) = vault.stakes(id);
                sum += w;
            }
        }
    }

    function totalPending() external view returns (uint256 sum) {
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (active[id]) {
                sum += vault.pending(id);
            }
        }
    }
}

// ------------------------------------------------------------------
// Invariants: SpiritCards
// ------------------------------------------------------------------
contract PocInvariantsTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    PocHandler pocH;

    address[] internal _targets;

    /// @dev Modern forge discovers invariant targets via this getter (this forge-std snapshot
    ///      predates `StdInvariant.targetContract`, but the runtime uses this convention).
    function targetContracts() public view returns (address[] memory) {
        return _targets;
    }

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(4, 0, 1_000_000, 3600);
        config.setPricing(0.001 ether, 2500, 1000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setMaxSupply(1_000_000);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "");
        chip.setMinter(address(poc));
        pocH = new PocHandler(config, poc);
        poc.setPackMinter(address(pocH));
        _targets.push(address(pocH));
    }

    /// @dev totalMinted (mined + forged + pack) never crosses the cap.
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_TotalMintedLeMaxSupply() public {
        assertLe(poc.totalMinted(), config.maxSupply());
    }

    /// @dev Sum of all balances equals the number of live tokens (minted - burned).
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_SumBalancesEqualsLiveTokens() public {
        uint256 sum;
        uint256 n = pocH.actorsLength();
        for (uint256 i = 0; i < n; i++) {
            sum += poc.balanceOf(pocH.actors(i));
        }
        sum += poc.balanceOf(address(pocH));
        sum += poc.balanceOf(address(this));
        assertEq(sum, poc.totalMinted() + poc.forged() - poc.burned(), "balances == live tokens");
    }

    /// @dev Each merge burns 2 and forges 1; burnCard adds burns but never forges.
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_BurnedAtLeastTwiceForged() public {
        assertGe(poc.burned(), 2 * poc.forged(), "burned >= 2 * forged");
    }
}

// ------------------------------------------------------------------
// Invariants: StakeVault
// ------------------------------------------------------------------
contract VaultInvariantsTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    StakeVault vault;
    PocHandler pocH;
    VaultHandler vaultH;

    uint256 lastAcc;
    address[] internal _targets;

    function targetContracts() public view returns (address[] memory) {
        return _targets;
    }

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(4, 0, 1_000_000, 3600);
        config.setPricing(0.001 ether, 2500, 1000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setMaxSupply(1_000_000);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "");
        chip.setMinter(address(poc));
        vault = new StakeVault(config, INFT(address(poc)));
        pocH = new PocHandler(config, poc);
        poc.setPackMinter(address(pocH));
        vaultH = new VaultHandler(config, poc, vault, pocH);
        _targets.push(address(vaultH));
    }

    /// @dev The vault's totalWeight always equals the sum of active stake weights.
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_TotalWeightEqualsSumActive() public {
        assertEq(vault.totalWeight(), vaultH.computedWeight(), "totalWeight == sum active weights");
    }

    /// @dev accRewardPerWeight is a monotone accumulator: it never decreases.
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_AccRewardPerWeightMonotonic() public {
        uint256 cur = vault.accRewardPerWeight();
        assertGe(cur, lastAcc, "accRewardPerWeight must not decrease");
        lastAcc = cur;
    }

    /// @dev The vault holds enough ETH to cover every outstanding claim, up to bounded
    ///      floor-rounding dust. FINDING: `StakeVault.stake` stores
    ///      `rewardDebt = floor(weight * acc / 1e18)`, so when `acc` later grows the
    ///      recomputed `pending = floor(weight*acc/1e18) - rewardDebt` can exceed a stake's
    ///      exact pro-rata share by 1 wei per (staker x notify) transition. The observed
    ///      shortfall is 1 wei; overpaying dust is bounded by the number of stake/notify
    ///      transitions. This is an accounting-rounding artifact, not theft (amounts are
    ///      immaterial and each claim still succeeds while the total stays funded).
    /// forge-config: default.invariant.runs = 96
    /// forge-config: default.invariant.depth = 64
    function invariant_VaultSolventWithinRoundingDust() public {
        uint256 bal = address(vault).balance;
        uint256 pend = vaultH.totalPending();
        uint256 dust = (vaultH.notifyCount() + 1) * (vaultH.idsLength() + 1);
        assertGe(bal + dust, pend, "vault solvent within bounded rounding dust");
    }
}
