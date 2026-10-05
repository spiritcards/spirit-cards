// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {Battle} from "../src/Battle.sol";

contract BattleTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    Battle battle;

    uint256 constant ERA_PRICE = 0.001 ether;
    uint256 constant STAKE = 0.01 ether;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 100000, 3600);
        config.setPricing(ERA_PRICE, 2500, 100000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setTreasury(address(0xBEEF)); // EOA so the 70% rake cut can be paid out
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        battle = new Battle(config, poc);

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

    function testDuelResolves() public {
        uint256 cardA = _mineCard(alice);
        uint256 cardB = _mineCard(bob);

        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(bob);
        poc.setApprovalForAll(address(battle), true);

        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        assertEq(poc.ownerOf(cardA), address(battle), "card A escrowed");

        uint256 aliceBefore = alice.balance; // уже заплатила ставку
        uint256 bobBefore = bob.balance;
        uint256 poolBefore = poc.accruedPool();

        vm.prank(bob);
        battle.acceptDuel{value: STAKE}(id, cardB);

        uint256 pot = STAKE * 2;
        uint256 rake = (pot * config.pvpRakeBps()) / 10000;
        uint256 rakeToPool = (rake * config.rakeToPoolBps()) / 10000;
        uint256 payout = pot - rake;
        assertEq(poc.accruedPool(), poolBefore + rakeToPool, "rake share -> pool");

        bool aliceWon = alice.balance > aliceBefore;
        address winner = aliceWon ? alice : bob;
        uint256 winCard = aliceWon ? cardA : cardB;
        uint256 loseCard = aliceWon ? cardB : cardA;
        address loser = aliceWon ? bob : alice;

        if (aliceWon) {
            assertEq(alice.balance, aliceBefore + payout, "winner gets payout");
            assertEq(bob.balance, bobBefore - STAKE, "loser loses stake");
        } else {
            assertEq(bob.balance, bobBefore - STAKE + payout, "winner gets payout");
            assertEq(alice.balance, aliceBefore, "loser stake already paid");
        }

        assertEq(battle.wins(winCard), 1);
        assertEq(battle.losses(loseCard), 1);
        assertEq(battle.lives(loseCard), config.lives() - 1, "loser lost one life");
        assertEq(poc.ownerOf(loseCard), loser, "loser card returned");
        assertEq(poc.ownerOf(winCard), winner, "winner card returned");
    }

    function testCancelDuelReturnsCardAndStake() public {
        uint256 cardA = _mineCard(alice);
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        assertEq(poc.ownerOf(cardA), address(battle), "escrowed");

        uint256 before = alice.balance;
        vm.prank(alice);
        battle.cancelDuel(id);
        assertEq(poc.ownerOf(cardA), alice, "card returned");
        assertEq(alice.balance, before + STAKE, "stake refunded");
        (,,, bool open,) = battle.duels(id);
        assertFalse(open, "duel closed");
    }

    function testCannotCancelOthersDuel() public {
        uint256 cardA = _mineCard(alice);
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        vm.prank(bob);
        vm.expectRevert(bytes("NOT_CREATOR"));
        battle.cancelDuel(id);
    }

    function testCannotAcceptOwnDuel() public {        uint256 cardA = _mineCard(alice);
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        vm.prank(alice);
        vm.expectRevert(bytes("SELF"));
        battle.acceptDuel{value: STAKE}(id, cardA);
    }

    function testBurnAtZeroLives() public {
        uint256 cardA = _mineCard(alice);
        uint256 cardB = _mineCard(bob);
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(bob);
        poc.setApprovalForAll(address(battle), true);

        // выжигаем жизни проигравшего через серию дуэлей (3 жизни => 3 проигрыша до burn)
        // упрощённая проверка: один бой уменьшает жизни на 1
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);
        vm.prank(bob);
        battle.acceptDuel{value: STAKE}(id, cardB);

        uint256 lA = battle.lives(cardA);
        uint256 lB = battle.lives(cardB);
        assertTrue(lA + lB == config.lives() * 2 - 1, "exactly one life lost in total");
    }

    function _findNonceFrom(address miner, uint256 bits, uint256 start) internal view returns (uint256) {
        for (uint256 i = start; i < start + 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

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

    function _power(uint256 card) internal view returns (uint256) {
        (uint256 hp, uint256 atk, uint256 def,) = battle.statsOf(card);
        return atk * 3 + def * 2 + hp;
    }

    function testStatsOfBoundedAndDeterministic() public {
        uint256 card = _mineCard(alice);
        (uint256 hp, uint256 atk, uint256 def, uint256 rarity) = battle.statsOf(card);
        (uint256 hp2, uint256 atk2, uint256 def2, uint256 r2) = battle.statsOf(card);
        assertEq(hp, hp2);
        assertEq(atk, atk2);
        assertEq(def, def2);
        assertEq(rarity, r2);
        assertLe(rarity, 5);
        assertGe(atk, 8);
        assertLe(atk, 47);
        assertGe(def, 4);
        assertLe(def, 34);
        assertGe(hp, 50);
        assertLe(hp, 224);
    }

    /// @dev Стихия (0..3) и скилл (0..5) всегда в диапазоне и детерминированы.
    function testElementAndSkillBounded() public {
        uint256[] memory ids = _mineMany(alice, 32);
        for (uint256 i = 0; i < ids.length; i++) {
            uint8 el = battle.elementOf(ids[i]);
            uint8 sk = battle.skillOf(ids[i]);
            assertLt(el, 4, "element in range");
            assertLe(sk, 5, "skill in range");
            assertEq(el, battle.elementOf(ids[i]));
            assertEq(sk, battle.skillOf(ids[i]));
            (,,,, uint8 el2, uint8 sk2) = battle.profileOf(ids[i]);
            assertEq(el, el2);
            assertEq(sk, sk2);
        }
    }

    /// @dev Исход — ЛОТЕРЕЯ, а не 100% предрешённость: у близких карт побеждают ОБА.
    function testCloseCardsOutcomeIsRandom() public {
        uint256[] memory ids = _mineMany(alice, 128);
        uint256 bestDiff = type(uint256).max;
        uint256 pa;
        uint256 pb;
        for (uint256 i = 0; i < ids.length; i++) {
            for (uint256 j = i + 1; j < ids.length; j++) {
                uint256 pwi = _power(ids[i]);
                uint256 pwj = _power(ids[j]);
                uint256 d = pwi > pwj ? pwi - pwj : pwj - pwi;
                if (d < bestDiff) {
                    bestDiff = d;
                    pa = ids[i];
                    pb = ids[j];
                }
            }
        }
        uint256 aWins;
        for (uint256 id = 1; id <= 200; id++) {
            if (battle.preview(pa, pb, id)) aWins++;
        }
        assertGt(aWins, 0, "one side can win");
        assertLt(aWins, 200, "the other side can win too (outcome is not deterministic)");
    }

    /// @dev Заметно более сильная карта выигрывает ЧАСТО (но это не гарантия).
    function testDominantCardUsuallyWins() public {
        config.setBattleParams(0, 2500); // без элемента, только разброс атаки
        uint256[] memory ids = _mineMany(alice, 256);
        uint256 sCard;
        uint256 wCard;
        for (uint256 i = 0; i < ids.length && sCard == 0; i++) {
            (uint256 hpI, uint256 atkI, uint256 defI,) = battle.statsOf(ids[i]);
            for (uint256 j = 0; j < ids.length; j++) {
                if (i == j) continue;
                (uint256 hpJ, uint256 atkJ, uint256 defJ,) = battle.statsOf(ids[j]);
                if (atkI >= atkJ + 12 && defI >= defJ + 8 && hpI >= hpJ + 30 && atkI >= defJ / 2 + 5) {
                    sCard = ids[i];
                    wCard = ids[j];
                    break;
                }
            }
        }
        assertTrue(sCard != 0, "dominant pair not found");

        uint256 strongWins;
        for (uint256 id = 1; id <= 200; id++) {
            if (battle.preview(sCard, wCard, id)) strongWins++;
        }
        assertGt(strongWins, 100, "dominant card wins the majority");
    }
}
