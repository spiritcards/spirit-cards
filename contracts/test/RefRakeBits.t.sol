// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {Battle} from "../src/Battle.sol";

/// @title Master-referral (3/7), PvP rake split (70/30), difficulty ramp (+0.33 bit/era)
contract RefRakeBitsTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    Battle battle;

    uint256 constant ERA_PRICE = 0.001 ether;
    uint256 constant STAKE = 0.01 ether;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address team = address(0x7EA3);
    address referrer = address(0x7EFE);

    uint256 _cursor;

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 1_000_000, 3600);
        config.setPricing(ERA_PRICE, 2500, 100_000);
        config.setSplit(6000, 1000, 3000, 0);
        config.setTreasury(team);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "");
        chip.setMinter(address(poc));
        battle = new Battle(config, poc);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(referrer, 100 ether);
    }

    function _findNonce(address who, uint256 bits, uint256 start) internal view returns (uint256) {
        for (uint256 i = start; i < start + 2_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(who, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    function _mine(address who) internal returns (uint256 id) {
        uint256 n = _findNonce(who, poc.requiredBits(), _cursor);
        _cursor = n + 1;
        vm.prank(who);
        poc.mine{value: ERA_PRICE}(n, false);
        id = poc.totalMinted();
    }

    function testMasterRefTakes3pctOfGross() public {
        poc.setMasterRef(team);
        _mine(alice);
        uint256 gross = ERA_PRICE;
        assertEq(poc.referralEarned(team), (gross * 300) / 10000, "master gets 3%");
        assertEq(poc.accruedReferral(), (gross * 1000) / 10000, "referral fund 10%");
        assertEq(poc.referralOutstanding(), (gross * 300) / 10000, "only master outstanding");
        // remaining 7% (no referrer) stays pooled -> sweepable
        uint256 before = team.balance;
        poc.withdrawReferralLeftover(team);
        assertEq(team.balance, before + (gross * 700) / 10000, "unassigned 7% swept");
    }

    function testMasterAndReferrerSplit() public {
        _mine(referrer); // referrer must have minted to be registered
        poc.setMasterRef(team); // arm the master cut AFTER referrer's own mint
        vm.prank(alice);
        poc.setReferrer(referrer);
        _mine(alice);
        uint256 gross = ERA_PRICE;
        assertEq(poc.referralEarned(team), (gross * 300) / 10000, "master 3%");
        assertEq(poc.referralEarned(referrer), (gross * 700) / 10000, "referrer 7%");
        assertEq(poc.referralOutstanding(), (gross * 1000) / 10000, "3%+7% outstanding");
    }

    function testNoMasterRefKeepsFull10pctToReferrer() public {
        _mine(referrer);
        vm.prank(alice);
        poc.setReferrer(referrer);
        _mine(alice);
        uint256 gross = ERA_PRICE;
        assertEq(poc.referralEarned(referrer), (gross * 1000) / 10000, "no master -> ref 10%");
    }

    function testRakeSplit70to30() public {
        uint256 cardA = _mine(alice);
        uint256 cardB = _mine(bob);
        vm.prank(alice);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(bob);
        poc.setApprovalForAll(address(battle), true);
        vm.prank(alice);
        uint256 id = battle.createDuel{value: STAKE}(cardA, STAKE);

        uint256 poolBefore = poc.accruedPool();
        uint256 teamBefore = team.balance;
        vm.prank(bob);
        battle.acceptDuel{value: STAKE}(id, cardB);

        uint256 pot = STAKE * 2;
        uint256 rake = (pot * config.pvpRakeBps()) / 10000;
        uint256 toPool = (rake * config.rakeToPoolBps()) / 10000;
        uint256 toHouse = rake - toPool;
        assertEq(poc.accruedPool(), poolBefore + toPool, "30% rake -> pool");
        assertEq(team.balance, teamBefore + toHouse, "70% rake -> treasury");
    }

    function testRequiredBitsRampsPerEra() public {
        config.setPricing(ERA_PRICE, 2500, 4); // price-era = 4 cards
        config.setBitsStep(100);               // +1 bit/era for a crisp assertion
        uint256 b0 = poc.requiredBits();
        for (uint256 i = 0; i < 4; i++) _mine(alice);
        assertEq(poc.requiredBits(), b0 + 1, "one era passed -> +1 bit");
    }

    function testDefaultBitsStepIsThirdOfBit() public {
        assertEq(config.bitsStepX100(), 33, "+0.33 bit per era default");
    }
}
