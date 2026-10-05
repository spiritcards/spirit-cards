// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {Packs} from "../src/Packs.sol";

contract PacksTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    Packs packs;

    uint256 constant ERA_PRICE = 0.001 ether;
    address buyer = address(0xB0B);

    function setUp() public {
        vm.warp(1_000_000);
        config = new Config();
        config.setMining(8, 0, 100000, 3600);
        config.setPricing(ERA_PRICE, 2500, 100000);
        config.setSplit(6000, 1000, 3000, 0);
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "https://example.invalid/poc/");
        chip.setMinter(address(poc));
        packs = new Packs(config, poc);
        poc.setPackMinter(address(packs));
        vm.deal(buyer, 100 ether);
    }

    function testBuyPackMintsAndSplits() public {
        uint256 price = packs.priceFor(0); // 5 × (2 × 0.001) − 3% = 0.0097
        uint256 unit = ERA_PRICE * 2; // ×2 к цене минта (packPriceBps = 20000)
        assertEq(price, unit * 5 - (unit * 5 * 300) / 10000);

        vm.prank(buyer);
        packs.buyPack{value: price}(0);

        assertEq(poc.balanceOf(buyer), 5, "5 cards minted");
        assertEq(poc.totalMinted(), 5);
        assertEq(poc.accruedPool(), (price * 6000) / 10000, "pool 60%");
        assertEq(poc.accruedHouse(), (price * 3000) / 10000, "house 30%");
        assertEq(packs.packsBought(buyer), 1);
        assertEq(packs.pity(buyer), 1);
    }

    function testPackPriceIsDoubleMintMinusVolumeDiscount() public {
        uint256 unit = ERA_PRICE * 2;
        assertEq(packs.priceFor(0), unit * 5 - (unit * 5 * 300) / 10000, "5-pack: 2x -3%");
        assertEq(packs.priceFor(4), unit * 100 - (unit * 100 * 3000) / 10000, "100-pack: 2x -30%");
        // 100-pack per-card is still above the mint price (mining stays the cheapest path)
        assertGt(packs.priceFor(4) / 100, ERA_PRICE, "per-card of big pack > mint price");
    }

    function testPackMultiplierIsTunable() public {
        config.setPackPriceBps(15000); // 1.5×
        uint256 unit = (ERA_PRICE * 15000) / 10000;
        assertEq(packs.priceFor(0), unit * 5 - (unit * 5 * 300) / 10000, "1.5x -3%");
        vm.expectRevert(bytes("LOW"));
        config.setPackPriceBps(9999);
    }

    function testBiggerPackCheaperPerCard() public {
        uint256 per5 = packs.priceFor(0) / 5;
        uint256 per100 = packs.priceFor(4) / 100;
        assertLt(per100, per5, "bigger pack => cheaper per card");
    }

    function testBadPayReverts() public {
        vm.prank(buyer);
        vm.expectRevert(bytes("BAD_PAY"));
        packs.buyPack{value: 1}(0);
    }

    function testOnlyOwnerSetsDiscount() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("NOT_OWNER"));
        packs.setDiscount(0, 500);
    }
}
