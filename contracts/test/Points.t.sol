// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";
import {Points} from "../src/Points.sol";

contract PointsTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;
    StakeVault vault;
    Points points;

    uint256 constant ERA_PRICE = 0.001 ether;
    address alice = address(0xA11CE);

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
        points = new Points(config);

        points.setAuthorized(address(poc), true);
        points.setAuthorized(address(vault), true);
        poc.setPointsContract(address(points));
        vault.setPointsContract(address(points));

        vm.deal(alice, 100 ether);
    }

    function _findNonce(address miner, uint256 bits, uint256 from) internal view returns (uint256) {
        for (uint256 i = from; i < from + 1_000_000; i++) {
            if (poc.leadingZeroBits(poc.workFor(miner, i)) >= bits) return i;
        }
        revert("no nonce");
    }

    uint256 nonceCursor;

    function _mine(address who) internal returns (uint256 id) {
        uint256 n = _findNonce(who, config.baseBits(), nonceCursor);
        nonceCursor = n + 1;
        vm.prank(who);
        poc.mine{value: ERA_PRICE}(n, false);
        id = poc.totalMinted();
    }

    function testMineGrantsPoints() public {
        _mine(alice);
        assertEq(points.points(alice), config.pointsMine());
    }

    function testMergeGrantsPoints() public {
        uint256 a = _mine(alice);
        uint256 b = _mine(alice);
        uint256 fee = config.mergeFee();
        config.setMerge(fee, 0); // deterministic: disable the random dud-merge
        vm.prank(alice);
        poc.mergeBurn{value: fee}(a, b);
        assertEq(points.points(alice), config.pointsMine() * 2 + config.pointsMerge());
    }

    function testStakeGrantsPoints() public {
        uint256 id = _mine(alice);
        vm.prank(alice);
        poc.setApprovalForAll(address(vault), true);
        vm.prank(alice);
        vault.stake(id, 0);
        assertEq(points.points(alice), config.pointsMine() + config.pointsStake());
    }

    function testOnlyAuthorizedCanAdd() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("NOT_AUTH"));
        points.addPoints(alice, 1, "X");
    }
}
