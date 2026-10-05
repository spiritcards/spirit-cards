// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";
import {Packs} from "../src/Packs.sol";
import {Points} from "../src/Points.sol";

/// @title FuzzTest — property/fuzz coverage for Config, SpiritCards, StakeVault, Packs, ChipToken, Points.
/// @notice Every test has random inputs (Foundry fuzz). Assertions are exact where the math is
///         deterministic and bounded, otherwise bounded with generous tolerances.
contract FuzzTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    StakeVault vault;
    Packs packs;
    Points points;

    uint256 constant ERA_PRICE = 0.001 ether;
    uint256 constant MERGE_FEE = 0.00002 ether;
    address constant TREASURY = address(0x7EA5);
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 1_000_000, 3600);
        config.setPricing(ERA_PRICE, 2500, 1000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setTreasury(TREASURY);
        config.setMaxSupply(100_000);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        vault = new StakeVault(config, INFT(address(poc)));
        packs = new Packs(config, poc);
        poc.setPackMinter(address(packs));
        points = new Points(config);
        config.setPoints(1, 2, 2, 3);
        vm.deal(address(this), 1000 ether);
        vm.deal(ALICE, 1000 ether);
        vm.deal(BOB, 1000 ether);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------
    function _findNonce(address miner, uint256 bits, uint256 from) internal view returns (uint256) {
        for (uint256 i = from; i < from + 2_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    function _mintPack(address to, uint256 n) internal returns (uint256 firstId) {
        poc.setPackMinter(address(this));
        firstId = poc.mintPack(to, n);
    }

    function _giveCard(address to) internal returns (uint256 id) {
        id = _mintPack(to, 1);
    }

    // ==================================================================
    // 1. CONFIG fuzz
    // ==================================================================

    function testFuzz_setSplit_validStoresExactly(uint256 p, uint256 r, uint256 h) public {
        p = bound(p, 0, 10000);
        r = bound(r, 0, 10000 - p);
        h = bound(h, 0, 10000 - p - r);
        uint256 res = 10000 - p - r - h;
        config.setSplit(p, r, h, res);
        assertEq(config.poolBps(), p, "pool");
        assertEq(config.referralBps(), r, "referral");
        assertEq(config.houseBps(), h, "house");
        assertEq(config.reserveBps(), res, "reserve");
        assertEq(config.poolBps() + config.referralBps() + config.houseBps() + config.reserveBps(), 10000);
    }

    function testFuzz_setSplit_wrongSumReverts(uint256 p, uint256 r, uint256 h, uint256 res) public {
        p = bound(p, 0, 10001);
        r = bound(r, 0, 10001);
        h = bound(h, 0, 10001);
        res = bound(res, 0, 10001);
        if (p + r + h + res == 10000) {
            config.setSplit(p, r, h, res);
            assertEq(config.poolBps(), p);
        } else {
            vm.expectRevert(bytes("SPLIT"));
            config.setSplit(p, r, h, res);
        }
    }

    function testFuzz_setMining_baseBitsBounds(uint256 baseBits) public {
        baseBits = bound(baseBits, 0, 400);
        if (baseBits > 0 && baseBits < 250) {
            config.setMining(baseBits, 1, 1, 1);
            assertEq(config.baseBits(), baseBits);
        } else {
            vm.expectRevert(bytes("BITS"));
            config.setMining(baseBits, 1, 1, 1);
        }
    }

    function testFuzz_setMining_epochBounds(uint256 cap, uint256 len) public {
        cap = bound(cap, 0, 1e30);
        len = bound(len, 0, 1e30);
        if (cap > 0 && len > 0) {
            config.setMining(8, 0, cap, len);
            assertEq(config.epochCap(), cap);
            assertEq(config.epochLength(), len);
        } else {
            vm.expectRevert(bytes("EPOCH"));
            config.setMining(8, 0, cap, len);
        }
    }

    function testFuzz_setChipBps_bound(uint256 bps) public {
        bps = bound(bps, 0, 20000);
        if (bps < 10000) {
            config.setChipBps(bps);
            assertEq(config.chipDiscountBps(), bps);
        } else {
            vm.expectRevert(bytes("BPS"));
            config.setChipBps(bps);
        }
    }

    function testFuzz_setRoyalty_bound(uint256 bps) public {
        bps = bound(bps, 0, 5000);
        if (bps <= 2000) {
            config.setRoyalty(bps);
            assertEq(config.royaltyBps(), bps);
        } else {
            vm.expectRevert(bytes("ROYALTY"));
            config.setRoyalty(bps);
        }
    }

    function testFuzz_setPvpRakeBps_bound(uint256 bps) public {
        bps = bound(bps, 0, 10000);
        if (bps <= 3000) {
            config.setPvpRakeBps(bps);
            assertEq(config.pvpRakeBps(), bps);
        } else {
            vm.expectRevert(bytes("RAKE"));
            config.setPvpRakeBps(bps);
        }
    }

    function testFuzz_setMerge_failBpsBound(uint256 fee, uint256 failBps) public {
        fee = bound(fee, 0, 1 ether);
        failBps = bound(failBps, 0, 10000);
        if (failBps <= 3000) {
            config.setMerge(fee, failBps);
            assertEq(config.mergeFee(), fee);
            assertEq(config.mergeFailBps(), failBps);
        } else {
            vm.expectRevert(bytes("FAIL"));
            config.setMerge(fee, failBps);
        }
    }

    function testFuzz_setMaxSupply_bound(uint256 m) public {
        m = bound(m, 0, 1e30);
        if (m > 0) {
            config.setMaxSupply(m);
            assertEq(config.maxSupply(), m);
        } else {
            vm.expectRevert(bytes("MAX"));
            config.setMaxSupply(m);
        }
    }

    function testFuzz_setLives_bound(uint256 l) public {
        l = bound(l, 0, 1e30);
        if (l > 0) {
            config.setLives(l);
            assertEq(config.lives(), l);
        } else {
            vm.expectRevert(bytes("LIVES"));
            config.setLives(l);
        }
    }

    function testFuzz_setPricing_eraSizeBound(uint256 eraSize) public {
        eraSize = bound(eraSize, 0, 1e30);
        if (eraSize > 0) {
            config.setPricing(1, 1, eraSize);
            assertEq(config.eraSize(), eraSize);
        } else {
            vm.expectRevert(bytes("ERA"));
            config.setPricing(1, 1, eraSize);
        }
    }

    function testFuzz_setPricing_stores(uint256 price, uint256 step, uint256 eraSize) public {
        price = bound(price, 0, 1e30);
        step = bound(step, 0, 100000);
        eraSize = bound(eraSize, 1, 1e30);
        config.setPricing(price, step, eraSize);
        assertEq(config.eraPrice(), price);
        assertEq(config.priceStepBps(), step);
        assertEq(config.eraSize(), eraSize);
    }

    function testFuzz_setStakingTier_weightMin(uint256 w) public {
        w = bound(w, 0, 1e30);
        if (w >= 1000) {
            config.setStakingTier(0, 0, w);
            assertEq(config.tierWeightX1000(0), w);
        } else {
            vm.expectRevert(bytes("WEIGHT"));
            config.setStakingTier(0, 0, w);
        }
    }

    function testFuzz_setStakingTier_orderEnforced(uint256 lock) public {
        lock = bound(lock, 0, 10 * 365 days);
        // tier 1 must be strictly greater than tier 0 lock (0)
        if (lock > config.tierLock(0)) {
            config.setStakingTier(1, lock, 1000);
            assertEq(config.tierLock(1), lock);
        } else {
            vm.expectRevert(bytes("ORDER"));
            config.setStakingTier(1, lock, 1000);
        }
    }

    function testFuzz_setPoints_stores(uint256 a, uint256 b, uint256 c, uint256 d) public {
        config.setPoints(a, b, c, d);
        assertEq(config.pointsMine(), a);
        assertEq(config.pointsMerge(), b);
        assertEq(config.pointsStake(), c);
        assertEq(config.pointsPvpWin(), d);
    }

    function testFuzz_onlyOwnerGuard(address caller) public {
        vm.assume(caller != address(this));
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_OWNER"));
        config.setSplit(1, 1, 1, 1);
    }

    function testFuzz_setTreasury_nonZero(uint256 a) public {
        address t = address(uint160(bound(a, 1, type(uint160).max)));
        config.setTreasury(t);
        assertEq(config.treasury(), t);
    }

    // ==================================================================
    // 2. SpiritCards fuzz
    // ==================================================================

    function testFuzz_currentPrice_nonDecreasing(uint256 step, uint256 advance) public {
        step = bound(step, 0, 5000);
        advance = bound(advance, 0, 200);
        config.setPricing(ERA_PRICE, step, 1);
        uint256 p0 = poc.currentPrice();
        if (advance > 0) _mintPack(address(this), advance);
        uint256 p1 = poc.currentPrice();
        assertGe(p1, p0, "price never decreases with paidMinted");
    }

    function testFuzz_currentPrice_capsAtEra64(uint256 step) public {
        step = bound(step, 1, 10000);
        config.setPricing(ERA_PRICE, step, 1);
        _mintPack(address(this), 64);
        uint256 p64 = poc.currentPrice();
        _mintPack(address(this), 100); // era goes well past 64
        assertEq(poc.currentPrice(), p64, "price frozen after era 64");
    }

    function testFuzz_royaltyInfo_exact(uint256 salePrice) public {
        salePrice = bound(salePrice, 0, 1e30);
        (address receiver, uint256 amount) = poc.royaltyInfo(1, salePrice);
        assertEq(receiver, TREASURY);
        assertEq(amount, (salePrice * config.royaltyBps()) / 10000);
    }

    function testFuzz_collectRevenue_splitSumsToAmount(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        poc.collectRevenue{value: amount}(ALICE);
        uint256 sum = poc.accruedPool() + poc.accruedHouse() + poc.accruedReserve() + poc.accruedReferral();
        assertEq(sum, amount, "split is money-conserving");
    }

    function testFuzz_mintPack_count(uint256 count) public {
        count = bound(count, 1, 50);
        poc.setPackMinter(address(this));
        uint256 before = poc.balanceOf(address(this));
        uint256 first = poc.mintPack(address(this), count);
        assertEq(poc.balanceOf(address(this)), before + count);
        assertEq(first, poc.totalMinted() - count + 1);
        assertEq(poc.totalMinted(), before + count);
    }

    function testFuzz_mintPack_respectsMaxSupply(uint256 count) public {
        config.setMaxSupply(10);
        count = bound(count, 11, 100);
        poc.setPackMinter(address(this));
        vm.expectRevert(bytes("SOLD_OUT"));
        poc.mintPack(address(this), count);
    }

    function testFuzz_mintPack_onlyPackMinter(address caller) public {
        vm.assume(caller != address(packs));
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_PACK_MINTER"));
        poc.mintPack(caller, 1);
    }

    function testFuzz_mine_wrongValueReverts(uint256 rawValue) public {
        uint256 nonce = _findNonce(address(this), 8, 0);
        uint256 price = poc.currentPrice();
        uint256 value = bound(rawValue, 0, price * 2);
        if (value != price) {
            vm.expectRevert(bytes("BAD_PAY"));
        }
        poc.mine{value: value}(nonce, false);
    }

    function testFuzz_mine_nonceReuseReverts(uint256 start) public {
        start = bound(start, 0, 500_000);
        uint256 nonce = _findNonce(address(this), 8, start);
        uint256 price = poc.currentPrice();
        poc.mine{value: price}(nonce, false);
        uint256 price2 = poc.currentPrice();
        vm.expectRevert(bytes("NONCE_USED"));
        poc.mine{value: price2}(nonce, false);
    }

    function testFuzz_burnCard_onlyOwner(uint256 callerSeed) public {
        uint256 id = _mintPack(ALICE, 1);
        address caller = address(uint160(bound(callerSeed, 2, type(uint160).max)));
        vm.assume(caller != ALICE);
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_OWNER"));
        poc.burnCard(id);
    }

    function testFuzz_transfer_movesBalance(uint256 toSeed) public {
        _mintPack(ALICE, 2);
        address to = toSeed % 2 == 0 ? BOB : address(0xCA401);
        vm.prank(ALICE);
        poc.transferFrom(ALICE, to, 1);
        assertEq(poc.balanceOf(ALICE), 1);
        assertEq(poc.balanceOf(to), 1);
        assertEq(poc.ownerOf(1), to);
        assertEq(poc.totalMinted(), 2, "transfer does not change supply");
    }

    function testFuzz_addToPool_accumulates(uint256 amount) public {
        amount = bound(amount, 0, 1000 ether);
        poc.addToPool{value: amount}();
        assertEq(poc.accruedPool(), amount);
    }

    // ==================================================================
    // 3. StakeVault fuzz
    // ==================================================================

    function testFuzz_stake_weightByTier(uint256 rawTier) public {
        uint256 tier = bound(rawTier, 0, config.TIER_COUNT() - 1);
        uint256 id = _mintPack(ALICE, 1);
        vm.prank(ALICE);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(ALICE);
        vault.stake(id, tier);
        (, uint256 gotTier, uint256 weight, , , bool active) = vault.stakes(id);
        assertEq(gotTier, tier);
        assertEq(weight, config.tierWeightX1000(tier));
        assertTrue(active);
        assertEq(vault.totalWeight(), weight);
    }

    function testFuzz_stake_invalidTierReverts(uint256 rawTier) public {
        uint256 tier = bound(rawTier, config.TIER_COUNT(), 100000);
        uint256 id = _mintPack(ALICE, 1);
        vm.prank(ALICE);
        vm.expectRevert(bytes("TIER"));
        vault.stake(id, tier);
    }

    function testFuzz_notifyRewards_exactProRata(uint256 k) public {
        k = bound(k, 1, 1_000_000);
        uint256 idA = _mintPack(ALICE, 1);
        uint256 idB = _mintPack(BOB, 1);
        vm.prank(ALICE);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(BOB);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(ALICE);
        vault.stake(idA, 0); // weight 1000
        vm.prank(BOB);
        vault.stake(idB, 1); // weight 5000
        // total weight 6000; reward 6000*k => exact 1e18-scaled acc
        uint256 reward = 6000 * k;
        vm.deal(address(this), reward);
        vault.notifyRewards{value: reward}();
        assertEq(vault.pending(idA), 1000 * k, "alice pro-rata exact");
        assertEq(vault.pending(idB), 5000 * k, "bob pro-rata exact");
    }

    function testFuzz_claim_neverExceedsDeposited(uint256 k) public {
        k = bound(k, 1, 1_000_000);
        uint256 id = _mintPack(ALICE, 1);
        vm.prank(ALICE);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(ALICE);
        vault.stake(id, 0); // weight 1000
        uint256 reward = 1000 * k;
        vm.deal(address(this), reward);
        vault.notifyRewards{value: reward}();
        uint256 pending = vault.pending(id);
        assertEq(pending, reward, "sole staker gets all");
        uint256 before = ALICE.balance;
        vm.prank(ALICE);
        vault.claim(id);
        assertEq(ALICE.balance, before + pending);
        assertEq(vault.pending(id), 0);
    }

    function testFuzz_unstake_afterLockClearsWeight(uint256 rawTier) public {
        uint256 tier = bound(rawTier, 0, config.TIER_COUNT() - 1);
        uint256 id = _mintPack(ALICE, 1);
        vm.prank(ALICE);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(ALICE);
        vault.stake(id, tier);
        vm.warp(block.timestamp + config.tierLock(tier));
        vm.prank(ALICE);
        vault.unstake(id);
        assertEq(vault.totalWeight(), 0);
        assertEq(poc.ownerOf(id), ALICE);
    }

    function testFuzz_unstake_beforeLockReverts(uint256 rawTier) public {
        uint256 tier = bound(rawTier, 1, config.TIER_COUNT() - 1); // all locked tiers
        uint256 id = _mintPack(ALICE, 1);
        vm.prank(ALICE);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(ALICE);
        vault.stake(id, tier);
        vm.prank(ALICE);
        vm.expectRevert(bytes("LOCKED"));
        vault.unstake(id);
    }

    function testFuzz_notifyRewards_noStakersAccumulates(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        vm.deal(address(this), amount);
        vault.notifyRewards{value: amount}();
        assertEq(vault.undistributed(), amount);
        assertEq(vault.accRewardPerWeight(), 0);
    }

    // ==================================================================
    // 4. Packs fuzz
    // ==================================================================

    function testFuzz_buyPack_mintsSizeAndCharges(uint256 rawI) public {
        uint256 i = bound(rawI, 0, packs.NUM() - 1);
        uint256 price = packs.priceFor(i);
        uint256 size = packs.size(i);
        vm.prank(BOB);
        packs.buyPack{value: price}(i);
        assertEq(poc.balanceOf(BOB), size, "minted size[i] cards");
        assertEq(poc.totalMinted(), size);
        assertEq(packs.packsBought(BOB), 1);
        assertEq(packs.pity(BOB), 1);
    }

    function testFuzz_buyPack_wrongValueReverts(uint256 rawI, uint256 rawV) public {
        uint256 i = bound(rawI, 0, packs.NUM() - 1);
        uint256 price = packs.priceFor(i);
        uint256 v = bound(rawV, 0, price * 2);
        vm.assume(v != price);
        vm.deal(BOB, v);
        vm.prank(BOB);
        vm.expectRevert(bytes("BAD_PAY"));
        packs.buyPack{value: v}(i);
    }

    function testFuzz_buyPack_invalidIndexReverts(uint256 rawI) public {
        uint256 i = bound(rawI, packs.NUM(), 100000);
        vm.prank(BOB);
        vm.expectRevert(bytes("IDX"));
        packs.buyPack{value: 1}(i);
    }

    function testFuzz_priceFor_formula(uint256 eraPrice, uint256 rawI) public {
        eraPrice = bound(eraPrice, 0, 1 ether);
        uint256 i = bound(rawI, 0, packs.NUM() - 1);
        config.setPricing(eraPrice, 0, 1e30); // step 0, huge era => currentPrice == eraPrice
        uint256 unit = (eraPrice * config.packPriceBps()) / 10000; // ×2 к цене минта
        uint256 base = unit * packs.size(i);
        uint256 expected = base - (base * packs.discountBps(i)) / 10000;
        assertEq(packs.priceFor(i), expected);
    }

    function testFuzz_buyPack_respectsMaxSupply(uint256 rawI) public {
        uint256 i = bound(rawI, 0, packs.NUM() - 1);
        config.setMaxSupply(packs.size(i) - 1); // one short
        uint256 price = packs.priceFor(i);
        vm.prank(BOB);
        vm.expectRevert(bytes("SOLD_OUT"));
        packs.buyPack{value: price}(i);
    }

    // ==================================================================
    // 5. ChipToken fuzz
    // ==================================================================

    function testFuzz_chip_mint_onlyMinter(address caller) public {
        vm.assume(caller != address(poc));
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_MINTER"));
        chip.mint(caller, 0, 1);
    }

    function testFuzz_chip_burn_onlyMinter(address caller) public {
        vm.assume(caller != address(poc));
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_MINTER"));
        chip.burn(caller, 0, 1);
    }

    function testFuzz_chip_mintThenBurn(uint256 amount) public {
        amount = bound(amount, 1, 1e30);
        vm.prank(address(poc));
        chip.mint(ALICE, 0, amount);
        assertEq(chip.balanceOf(ALICE, 0), amount);
        vm.prank(address(poc));
        chip.burn(ALICE, 0, amount);
        assertEq(chip.balanceOf(ALICE, 0), 0);
    }

    function testFuzz_chip_burnInsufficientReverts(uint256 minted, uint256 rawBurn) public {
        minted = bound(minted, 0, 1e30);
        rawBurn = bound(rawBurn, 0, 1e30);
        vm.prank(address(poc));
        chip.mint(ALICE, 0, minted);
        if (rawBurn > minted) {
            vm.prank(address(poc));
            vm.expectRevert(bytes("INSUFFICIENT"));
            chip.burn(ALICE, 0, rawBurn);
        } else {
            vm.prank(address(poc));
            chip.burn(ALICE, 0, rawBurn);
            assertEq(chip.balanceOf(ALICE, 0), minted - rawBurn);
        }
    }

    function testFuzz_chip_transfer_updates(uint256 minted, uint256 rawValue) public {
        minted = bound(minted, 0, 1e30);
        rawValue = bound(rawValue, 0, 1e30);
        vm.prank(address(poc));
        chip.mint(ALICE, 0, minted);
        if (rawValue > minted) {
            vm.prank(ALICE);
            vm.expectRevert();
            chip.safeTransferFrom(ALICE, BOB, 0, rawValue, "");
        } else {
            vm.prank(ALICE);
            chip.safeTransferFrom(ALICE, BOB, 0, rawValue, "");
            assertEq(chip.balanceOf(ALICE, 0), minted - rawValue);
            assertEq(chip.balanceOf(BOB, 0), rawValue);
        }
    }

    function testFuzz_chip_transfer_unauthorizedReverts(address caller) public {
        vm.assume(caller != ALICE);
        vm.prank(address(poc));
        chip.mint(ALICE, 0, 100);
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_AUTH"));
        chip.safeTransferFrom(ALICE, BOB, 0, 1, "");
    }

    // ==================================================================
    // 6. Points fuzz
    // ==================================================================

    function testFuzz_points_authorizedAccumulates(uint256 amount) public {
        points.setAuthorized(address(poc), true);
        amount = bound(amount, 0, 1e30);
        vm.prank(address(poc));
        points.addPoints(ALICE, amount, "TEST");
        assertEq(points.points(ALICE), amount);
    }

    function testFuzz_points_unauthorizedReverts(address caller) public {
        vm.assume(caller != address(this)); // owner is this test contract
        vm.assume(!points.authorized(caller));
        vm.prank(caller);
        vm.expectRevert(bytes("NOT_AUTH"));
        points.addPoints(ALICE, 1, "TEST");
    }
}
