// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";

contract StakeVaultTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    StakeVault vault;

    uint256 constant ERA_PRICE = 0.001 ether;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 100000, 3600);
        config.setPricing(ERA_PRICE, 2500, 100000);
        config.setSplit(6000, 1000, 3000, 0);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        vault = new StakeVault(config, INFT(address(poc)));

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _findNonce(address miner, uint256 bits) internal view returns (uint256) {
        for (uint256 i = 0; i < 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    function _mineCard(address who) internal returns (uint256 id) {
        uint256 n = _findNonce(who, config.baseBits());
        vm.prank(who);
        poc.mine{value: ERA_PRICE}(n, false);
        id = poc.totalMinted();
    }

    function _findNonceFrom(address miner, uint256 bits, uint256 start) internal view returns (uint256) {
        for (uint256 i = start; i < start + 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    /// @dev Mine `count` cards for `who` using distinct nonces (cooldown = 0 in setUp).
    function _mineMany(address who, uint256 count) internal returns (uint256[] memory ids) {
        ids = new uint256[](count);
        uint256 from = 0;
        for (uint256 i = 0; i < count; i++) {
            uint256 n = _findNonceFrom(who, config.baseBits(), from);
            vm.prank(who);
            poc.mine{value: ERA_PRICE}(n, false);
            ids[i] = poc.totalMinted();
            from = n + 1;
        }
    }

    function _stake(address who, uint256 id, uint256 tier) internal {
        vm.prank(who);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(who);
        vault.stake(id, tier);
    }

    function testStakeTransfersAndRecords() public {
        uint256 id = _mineCard(alice);
        _stake(alice, id, 1); // tier 1 = 7d lock, weight 5000
        assertEq(poc.ownerOf(id), address(vault), "vault owns staked card");
        (, uint256 tier, uint256 weight, , , ) = vault.stakes(id);
        assertEq(tier, 1);
        assertEq(weight, 5000);
        assertEq(vault.totalWeight(), 5000);
    }

    function testRewardsProRataByWeight() public {
        uint256 idA = _mineCard(alice);
        uint256 idB = _mineCard(bob);
        _stake(alice, idA, 0); // weight 1000
        _stake(bob, idB, 1);   // weight 5000
        assertEq(vault.totalWeight(), 6000);

        vm.deal(address(this), 1 ether);
        vault.notifyRewards{value: 6000 wei}();

        assertEq(vault.pending(idA), 1000, "alice 1000/6000");
        assertEq(vault.pending(idB), 5000, "bob 5000/6000");
    }

    function testClaimPays() public {
        uint256 id = _mineCard(alice);
        _stake(alice, id, 0);
        vm.deal(address(this), 1 ether);
        vault.notifyRewards{value: 1000 wei}();

        uint256 before = alice.balance;
        vm.prank(alice);
        vault.claim(id);
        assertEq(alice.balance, before + 1000);
        assertEq(vault.pending(id), 0);
    }

    function testEarlyUnstakeReverts() public {
        uint256 id = _mineCard(alice);
        _stake(alice, id, 2); // 30d lock
        vm.prank(alice);
        vm.expectRevert(bytes("LOCKED"));
        vault.unstake(id);
    }

    function testUnstakeAfterLockReturnsCard() public {
        uint256 id = _mineCard(alice);
        _stake(alice, id, 1); // 7d
        vm.warp(block.timestamp + 7 days);
        vm.prank(alice);
        vault.unstake(id);
        assertEq(poc.ownerOf(id), alice, "card returned");
        assertEq(vault.totalWeight(), 0);
    }

    function testNoStakersAccumulate() public {
        vm.deal(address(this), 1 ether);
        vault.notifyRewards{value: 500 wei}();
        assertEq(vault.undistributed(), 500);
        // первый стейкер распределяет накопленное
        uint256 id = _mineCard(alice);
        _stake(alice, id, 0);
        assertEq(vault.undistributed(), 0);
        assertEq(vault.pending(id), 500, "first staker captures undistributed");
    }

    function testStakeBatchStakesAllInOneTx() public {
        uint256[] memory ids = _mineMany(alice, 3);
        vm.prank(alice);
        poc.setApprovalForAll(address(vault), true);

        vm.prank(alice);
        vault.stakeBatch(ids, 1); // tier 1 = weight 5000 each

        assertEq(vault.totalWeight(), 15000, "3 cards x 5000");
        for (uint256 i = 0; i < ids.length; i++) {
            assertEq(poc.ownerOf(ids[i]), address(vault), "vault owns card");
            (, uint256 tier, uint256 weight, , , bool active) = vault.stakes(ids[i]);
            assertEq(tier, 1);
            assertEq(weight, 5000);
            assertTrue(active);
        }
    }

    function testStakeBatchEmptyReverts() public {
        uint256[] memory empty = new uint256[](0);
        vm.prank(alice);
        vm.expectRevert(bytes("EMPTY"));
        vault.stakeBatch(empty, 0);
    }

    function testStakeBatchAtomicWhenNotOwner() public {
        uint256[] memory ids = _mineMany(alice, 2);
        vm.prank(alice);
        poc.setApprovalForAll(address(vault), true);
        // bob tries to batch-stake alice's cards -> reverts, alice keeps them
        vm.prank(bob);
        vm.expectRevert(bytes("NOT_OWNER"));
        vault.stakeBatch(ids, 0);
        assertEq(vault.totalWeight(), 0, "nothing partially staked");
        assertEq(poc.ownerOf(ids[0]), alice);
    }

    function testStakeBatchRejectsAlreadyStaked() public {
        uint256[] memory ids = _mineMany(alice, 2);
        vm.prank(alice);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(alice);
        vault.stake(ids[0], 0);
        // ids[0] now lives in the vault, so the batch sees it as not-owned -> atomic revert
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_OWNER"));
        vault.stakeBatch(ids, 0);
        assertEq(vault.totalWeight(), 1000, "only the first single stake remains");
    }

    function _stakeBatch(address who, uint256[] memory ids, uint256 tier) internal {
        vm.prank(who);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(who);
        vault.stakeBatch(ids, tier);
    }

    function testClaimBatchPaysAll() public {
        uint256[] memory ids = _mineMany(alice, 3);
        _stakeBatch(alice, ids, 0); // weight 1000 each
        vm.deal(address(this), 1 ether);
        vault.notifyRewards{value: 3000 wei}(); // 1000 per card

        uint256 before = alice.balance;
        vm.prank(alice);
        vault.claimBatch(ids);
        assertEq(alice.balance, before + 3000, "all three claims paid in one tx");
        for (uint256 i = 0; i < ids.length; i++) {
            assertEq(vault.pending(ids[i]), 0, "nothing left pending");
        }
    }

    function testClaimBatchEmptyReverts() public {
        uint256[] memory empty = new uint256[](0);
        vm.prank(alice);
        vm.expectRevert(bytes("EMPTY"));
        vault.claimBatch(empty);
    }

    function testClaimBatchRejectsNonStaker() public {
        uint256[] memory ids = _mineMany(alice, 1);
        _stakeBatch(alice, ids, 0);
        vm.prank(bob);
        vm.expectRevert(bytes("NOT_STAKER"));
        vault.claimBatch(ids);
    }

    function testUnstakeBatchReturnsAll() public {
        uint256[] memory ids = _mineMany(alice, 3);
        _stakeBatch(alice, ids, 0); // flexible (lock 0)
        assertEq(vault.totalWeight(), 3000);

        vm.prank(alice);
        vault.unstakeBatch(ids);
        assertEq(vault.totalWeight(), 0, "all weight removed");
        for (uint256 i = 0; i < ids.length; i++) {
            assertEq(poc.ownerOf(ids[i]), alice, "card returned");
        }
    }

    function testUnstakeBatchRevertsWhenLocked() public {
        uint256[] memory ids = _mineMany(alice, 2);
        _stakeBatch(alice, ids, 2); // 30-day lock
        vm.prank(alice);
        vm.expectRevert(bytes("LOCKED"));
        vault.unstakeBatch(ids);
        assertEq(vault.totalWeight(), 20000, "nothing partially unstaked (tier2 = 10000 each)");
    }

    function testUnstakeBatchAfterLocks() public {
        uint256[] memory ids = _mineMany(alice, 2);
        _stakeBatch(alice, ids, 1); // 7-day lock
        vm.warp(block.timestamp + 7 days);
        vm.prank(alice);
        vault.unstakeBatch(ids);
        assertEq(vault.totalWeight(), 0);
        assertEq(poc.ownerOf(ids[0]), alice);
        assertEq(poc.ownerOf(ids[1]), alice);
    }
}
