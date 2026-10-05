// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";

contract SpiritCardsTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;

    address treasury = address(0x7EA5);

    uint256 constant ERA_PRICE = 0.001 ether;
    uint256 constant MERGE_FEE = 0.00002 ether;
    uint256 constant CHIP = 0;

    function setUp() public {
        vm.warp(1_000_000); // non-zero time so cooldown math works from first mine
        config = new Config();
        config.setMining(8, 0, 250, 600); // лёгкая сложность, без cooldown, эпоха 600с
        config.setPricing(ERA_PRICE, 2500, 1000);
        config.setSplit(6000, 1000, 3000, 0); // R3: pool 60 / referral 10 / treasury 30
        config.setTreasury(treasury);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        vm.deal(address(this), 100 ether);
    }

    function _findNonce(address miner, uint256 bits) internal view returns (uint256 nonce) {
        for (uint256 i = 0; i < 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    function testMineValid() public {
        uint256 nonce = _findNonce(address(this), config.baseBits());
        uint256 price = poc.currentPrice();
        poc.mine{value: price}(nonce, false);
        assertEq(poc.ownerOf(1), address(this));
        assertEq(poc.balanceOf(address(this)), 1);
        assertEq(chip.balanceOf(address(this), CHIP), 1, "paid mint grants chip (ERC-1155)");
        assertEq(poc.totalMinted(), 1);
        assertEq(poc.paidMinted(), 1);
    }

    function testMineBadPowReverts() public {
        config.setMining(200, 0, 250, 600); // почти невозможно
        vm.expectRevert(bytes("BAD_POW"));
        poc.mine{value: ERA_PRICE}(1, false);
    }

    function testBadPayReverts() public {
        uint256 nonce = _findNonce(address(this), config.baseBits());
        vm.expectRevert(bytes("BAD_PAY"));
        poc.mine{value: ERA_PRICE + 1}(nonce, false);
    }

    function testCooldownReverts() public {
        config.setMining(8, 45, 250, 600);
        uint256 n1 = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n1, false);
        uint256 n2 = _findNonce2(address(this), 8, n1);
        vm.expectRevert(bytes("COOLDOWN"));
        poc.mine{value: ERA_PRICE}(n2, false);
    }

    function testEpochCapReverts() public {
        config.setMining(8, 0, 1, 600); // cap = 1
        uint256 n1 = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n1, false);
        uint256 n2 = _findNonce2(address(this), 8, n1);
        vm.expectRevert(bytes("EPOCH_FULL"));
        poc.mine{value: ERA_PRICE}(n2, false);
    }

    function testChipDiscount() public {
        uint256 n1 = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n1, false); // full-price mint -> +1 chip
        assertEq(chip.balanceOf(address(this), CHIP), 1);

        uint256 price = poc.currentPrice();
        uint256 due = price - (price * config.chipDiscountBps()) / 10000;
        uint256 n2 = _findNonce2(address(this), 8, n1);
        poc.mine{value: due}(n2, true); // CONSUMES the chip, does NOT re-grant it
        assertEq(chip.balanceOf(address(this), CHIP), 0, "chip consumed, not re-granted");
        assertEq(poc.balanceOf(address(this)), 2);

        // A later FULL-price mint grants a fresh chip again (accelerator, not a permanent -30%).
        uint256 n3 = _findNonce2(address(this), 8, n2);
        poc.mine{value: poc.currentPrice()}(n3, false);
        assertEq(chip.balanceOf(address(this), CHIP), 1, "full-price mint grants a new chip");
    }

    function testPriceLadderIncreases() public {
        uint256 p0 = poc.currentPrice();
        config.setPricing(ERA_PRICE, 1200, 1); // эра = 1 карта
        uint256 n1 = _findNonce(address(this), 8);
        poc.mine{value: poc.currentPrice()}(n1, false);
        uint256 p1 = poc.currentPrice();
        assertGt(p1, p0, "price rises gently per era");
    }

    function testMergeBurnsAndMints() public {
        uint256 n1 = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n1, false);
        uint256 n2 = _findNonce2(address(this), 8, n1);
        poc.mine{value: ERA_PRICE}(n2, false);
        assertEq(poc.balanceOf(address(this)), 2);

        config.setMerge(config.mergeFee(), 0); // deterministic: disable the random dud-merge
        poc.mergeBurn{value: MERGE_FEE}(1, 2);
        assertEq(poc.balanceOf(address(this)), 1, "2 burned -> 1 minted");
        assertEq(poc.burned(), 2);
        assertEq(poc.forged(), 1);
        assertEq(poc.ownerOf(10_000_001), address(this));
        vm.expectRevert(bytes("NOT_MINTED"));
        poc.ownerOf(1);
    }

    function testSeedSetImmediately() public {
        uint256 n = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n, false);
        assertTrue(poc.seedOf(1) != bytes32(0), "rarity printed immediately (single-tx)");
    }

    function testSplitAccumulates() public {
        uint256 n = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n, false);
        // pool 60% / referral 10% / treasury 30% / reserve 0
        assertEq(poc.accruedPool(), (ERA_PRICE * 6000) / 10000);
        assertEq(poc.accruedReferral(), (ERA_PRICE * 1000) / 10000);
        assertEq(poc.accruedHouse(), (ERA_PRICE * 3000) / 10000);
        assertEq(poc.accruedReserve(), 0, "no reserve in R3 split");
    }

    function testConfigSplitInvariant() public {
        vm.expectRevert(bytes("SPLIT"));
        config.setSplit(5000, 1000, 2000, 1000); // != 10000
    }

    function testRoyalty() public {
        uint256 n = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n, false);
        (address receiver, uint256 amount) = poc.royaltyInfo(1, 1 ether);
        assertEq(receiver, treasury);
        assertEq(amount, (1 ether * config.royaltyBps()) / 10000); // 5%
    }

    function testReferralAccruesAndClaims() public {
        address alice = address(0xA11CE);
        address bob = address(0xB0B);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);

        uint256 n1 = _findNonce(alice, 8);
        vm.prank(alice);
        poc.mine{value: ERA_PRICE}(n1, false); // alice minted -> can be referrer

        vm.prank(bob);
        poc.setReferrer(alice);

        uint256 n2 = _findNonce(bob, 8);
        vm.prank(bob);
        poc.mine{value: ERA_PRICE}(n2, false); // bob's fee -> 10% to alice

        uint256 expected = (ERA_PRICE * 1000) / 10000;
        assertEq(poc.referralEarned(alice), expected);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        poc.claimReferral();
        assertEq(alice.balance, balBefore + expected);
        assertEq(poc.referralEarned(alice), 0);
    }

    function testWithdrawPool() public {
        uint256 n = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n, false);
        uint256 pool = poc.accruedPool();
        assertGt(pool, 0, "pool accrued from mine split");

        address sink = address(0xFEE);
        uint256 before = sink.balance;
        poc.withdrawPool(sink); // owner = address(this)
        assertEq(sink.balance, before + pool, "pool paid out");
        assertEq(poc.accruedPool(), 0, "pool drained");
    }

    function testWithdrawPoolOnlyOwner() public {
        uint256 n = _findNonce(address(this), 8);
        poc.mine{value: ERA_PRICE}(n, false);
        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("NOT_OWNER"));
        poc.withdrawPool(address(0xFEE));
    }

    function testReferralLeftoverKeepsOwed() public {
        address alice = address(0xA11CE);
        address bob = address(0xB0B);
        address carol = address(0xCA401);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);

        uint256 n1 = _findNonce(alice, 8);
        vm.prank(alice);
        poc.mine{value: ERA_PRICE}(n1, false); // alice has no referrer -> surplus

        vm.prank(bob);
        poc.setReferrer(alice);
        uint256 n2 = _findNonce(bob, 8);
        vm.prank(bob);
        poc.mine{value: ERA_PRICE}(n2, false); // bob's fee -> alice owed

        uint256 n3 = _findNonce(carol, 8);
        vm.prank(carol);
        poc.mine{value: ERA_PRICE}(n3, false); // another surplus

        uint256 owed = (ERA_PRICE * 1000) / 10000; // one referred mint
        assertEq(poc.referralOutstanding(), owed, "only bob's share is owed to alice");
        assertEq(poc.accruedReferral(), owed * 3, "fund holds 3 mints' referral cut");

        // owner sweeps ONLY the unattributed surplus (2 cuts), keeping alice's owed
        address sink = address(0xFEE);
        uint256 before = sink.balance;
        poc.withdrawReferralLeftover(sink);
        assertEq(sink.balance, before + owed * 2, "surplus swept");
        assertEq(poc.accruedReferral(), owed, "alice's owed still funded");

        // alice can still claim what was credited to her (was broken before the fix)
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        poc.claimReferral();
        assertEq(alice.balance, aliceBefore + owed, "alice claim intact after sweep");
        assertEq(poc.referralOutstanding(), 0);
        assertEq(poc.accruedReferral(), 0);
    }

    function _findNonce2(address miner, uint256 bits, uint256 skip) internal view returns (uint256) {
        for (uint256 i = skip + 1; i < skip + 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }
}
