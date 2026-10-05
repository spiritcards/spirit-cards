// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";
import {Battle} from "../src/Battle.sol";

/// @title Staked cards can fight.
/// @dev Design: a staked card never leaves the vault — Battle only LOCKS it, so the
///      staker keeps earning and needs no NFT approval for the battle.
contract BattleStakedTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    StakeVault vault;
    Battle battle;

    uint256 constant STAKE = 0.01 ether;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 1_000_000, 3600);
        config.setPricing(0.001 ether, 2500, 1_000_000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setTreasury(address(0xBEEF)); // EOA so the 70% rake cut can be paid out

        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        poc.setPackMinter(address(this)); // test contract mints packs directly

        vault = new StakeVault(config, INFT(address(poc)));
        battle = new Battle(config, poc);
        battle.setVault(address(vault));
        vault.setBattle(address(battle));

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // --- helpers ---------------------------------------------------------
    function _mintMany(address to, uint256 n) internal returns (uint256[] memory ids) {
        uint256 before = poc.totalMinted();
        poc.mintPack(to, n);
        ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) ids[i] = before + 1 + i;
    }

    function _power(uint256 card) internal view returns (uint256) {
        (uint256 hp, uint256 atk, uint256 def,) = battle.statsOf(card);
        return atk * 3 + def * 2 + hp;
    }

    function _stake(address who, uint256 card) internal {
        vm.prank(who);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(who);
        vault.stake(card, 0);
    }

    function _isActive(uint256 card) internal view returns (bool) {
        (,,,,, bool active) = vault.stakes(card);
        return active;
    }

    function _stakeWeight(uint256 card) internal view returns (uint256) {
        (,, uint256 w,,,) = vault.stakes(card);
        return w;
    }

    // --- tests -----------------------------------------------------------

    function testStakedCardCreatesDuelWithoutBattleApproval() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        _stake(alice, cardA);

        // NOTE: alice never approved Battle for the core NFT.
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);

        assertEq(poc.ownerOf(cardA), address(vault), "card stays in the vault");
        assertTrue(vault.inBattle(cardA), "card locked for battle");
        assertEq(vault.stakerOf(cardA), alice, "staker unchanged");
        assertTrue(_isActive(cardA), "stake still active");
        (address a, uint256 cA, uint256 stake, bool open, bool fromVault) = battle.duels(id);
        assertEq(a, alice);
        assertEq(cA, cardA);
        assertEq(stake, STAKE);
        assertTrue(open);
        assertTrue(fromVault, "duel remembers the card came from the vault");
    }

    function testCannotUnstakeCardWhileInDuel() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        _stake(alice, cardA);
        vm.prank(alice);
        battle.createDuel{value: STAKE}(cardA, STAKE);

        vm.prank(alice);
        vm.expectRevert(bytes("IN_BATTLE"));
        vault.unstake(cardA);
    }

    function testCannotReuseLockedStakedCard() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        _stake(alice, cardA);
        vm.prank(alice);
        battle.createDuel{value: STAKE}(cardA, STAKE);

        vm.prank(alice);
        vm.expectRevert(bytes("IN_BATTLE"));
        battle.createDuel{value: STAKE}(cardA, STAKE);
    }

    function testCancelDuelUnlocksStakedCard() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        _stake(alice, cardA);
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);

        uint256 before = alice.balance;
        vm.prank(alice);
        battle.cancelDuel(id);

        assertFalse(vault.inBattle(cardA), "unlocked");
        assertEq(poc.ownerOf(cardA), address(vault), "still staked");
        assertTrue(_isActive(cardA), "stake active");
        assertEq(alice.balance, before + STAKE, "stake refunded");
    }

    function testAcceptWithStakedCard() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        uint256 cardB = _mintMany(bob, 1)[0];

        _stake(bob, cardB); // B is staked
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true); // A is a wallet card

        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        assertEq(poc.ownerOf(cardA), address(battle), "wallet card escrowed");

        vm.prank(bob);
        battle.acceptDuel{value: STAKE}(id, cardB);

        // Both cards always end up owned by whoever should hold them.
        assertFalse(vault.inBattle(cardB), "bob's staked card unlocked");
        assertTrue(_isActive(cardB), "bob's stake persists");
        assertEq(poc.ownerOf(cardB), address(vault), "bob's card stays in the vault");
        assertEq(poc.ownerOf(cardA), alice, "alice keeps her wallet card");
        assertEq(battle.wins(cardA) + battle.wins(cardB), 1, "exactly one winner");
        assertEq(battle.losses(cardA) + battle.losses(cardB), 1, "exactly one loser");
    }

    function testStakedVsWalletResultKeepsStakeAndLives() public {
        uint256[] memory ids = _mintMany(alice, 1);
        uint256 cardA = ids[0];
        uint256 cardB = _mintMany(bob, 1)[0];
        _stake(alice, cardA);

        vm.prank(bob);
        poc.setApprovalForAll(address(battle), true);

        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        bool aWins = battle.preview(cardA, cardB, id); // same-block prevrandao → matches accept

        vm.prank(bob);
        battle.acceptDuel{value: STAKE}(id, cardB);

        // Staked card always lands back in the vault and stays staked.
        assertEq(poc.ownerOf(cardA), address(vault), "staked card back in vault");
        assertFalse(vault.inBattle(cardA), "unlocked after duel");
        assertTrue(_isActive(cardA), "still staked");
        // The loser lost exactly one life; the winner's card kept all lives.
        if (aWins) {
            assertEq(battle.lives(cardB), config.lives() - 1, "B lost a life");
            assertEq(poc.ownerOf(cardB), bob, "B returned to bob");
        } else {
            assertEq(battle.lives(cardA), config.lives() - 1, "A lost a life");
            assertEq(battle.wins(cardB), 1, "B won");
        }
    }

    /// @dev A staked card that runs out of lives is burned, its stake cleared and
    ///      its pending rewards settled to the staker.
    function testStakedCardDiesClearsStakeAndPaysPending() public {
        // Deterministic battle (no element edge, no per-battle roll) so the dominant
        // opponent reliably wins all 3 duels — this test is about the LIFE/BURN path.
        config.setBattleParams(0, 0);
        // Pick a weak victim (alice's) and a dominant opponent (bob's), so the
        // victim loses every duel and its 3 lives run out.
        uint256[] memory victims = _mintMany(alice, 256);
        uint256[] memory opponents = _mintMany(bob, 256);
        uint256 weak = victims[0];
        for (uint256 i = 1; i < victims.length; i++) {
            if (_power(victims[i]) < _power(weak)) weak = victims[i];
        }
        uint256 strong = opponents[0];
        for (uint256 i = 1; i < opponents.length; i++) {
            if (_power(opponents[i]) > _power(strong)) strong = opponents[i];
        }
        require(_power(strong) >= _power(weak) + 60, "opponent must dominate");

        _stake(alice, weak); // alice stakes the weak card
        vm.prank(bob);
        poc.setApprovalForAll(address(battle), true);

        // Fund the pool so the staker has pending rewards before the killing blow.
        vault.notifyRewards{value: 1 ether}();
        uint256 pending = vault.pending(weak);
        assertGt(pending, 0, "victim accrues rewards");

        uint256 weight = _stakeWeight(weak);
        uint256 weightBefore = vault.totalWeight();

        // Three duels vs the dominant card → weak card's 3 lives run out.
        for (uint256 k = 0; k < 3; k++) {
            assertEq(battle.lives(weak), 3 - k, "victim lives countdown");
            vm.prank(alice);
            uint256 id = battle.createDuel{value: STAKE}(weak, STAKE);
            assertTrue(vault.inBattle(weak), "locked");

            if (k == 2) {
                // Killing blow: isolate the reward payout.
                uint256 aliceBal = alice.balance;
                vm.prank(bob);
                battle.acceptDuel{value: STAKE}(id, strong);
                assertEq(alice.balance, aliceBal + pending, "pending paid on kill");
            } else {
                vm.prank(bob);
                battle.acceptDuel{value: STAKE}(id, strong);
                assertFalse(vault.inBattle(weak), "unlocked after surviving");
                assertTrue(_isActive(weak), "still staked between duels");
            }
        }

        // Card burned, stake cleared, weight released.
        assertEq(poc.burned(), 1, "victim burned");
        assertFalse(_isActive(weak), "stake cleared");
        assertEq(vault.totalWeight(), weightBefore - weight, "weight released");
        assertFalse(vault.inBattle(weak), "not in battle anymore");
    }
}
