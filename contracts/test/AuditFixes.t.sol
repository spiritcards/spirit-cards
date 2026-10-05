// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";
import {Battle} from "../src/Battle.sol";
import {Points} from "../src/Points.sol";

/// @dev Regression tests for the fixes from the 2026-09 functional review.
contract AuditFixesTest is Test {
    Config internal config;
    ChipToken internal chip;
    SpiritCards internal poc;
    StakeVault internal vault;
    Battle internal battle;
    Points internal points;

    function setUp() public {
        vm.deal(address(this), 100 ether);
        config = new Config();
        chip = new ChipToken();
        poc = new SpiritCards(config, chip, "");
        chip.setMinter(address(poc));
        vault = new StakeVault(config, INFT(address(poc)));
        battle = new Battle(config, poc);
        points = new Points(config);

        poc.setPointsContract(address(points));
        vault.setPointsContract(address(points));
        points.setAuthorized(address(poc), true);
        points.setAuthorized(address(vault), true);
        points.setAuthorized(address(battle), true);

        // keeper wiring
        poc.setVault(address(vault));
        battle.setVault(address(vault));
        vault.setBattle(address(battle));
    }

    /// KEEPER: `pumpPool()` moves the accrued pool straight into staker rewards —
    /// permissionless, so a cron/UI/anyone can flush dividends (fixes "staking pays nothing").
    function test_pumpPool_flushesDividends() public {
        poc.collectRevenue{value: 1 ether}(address(this)); // 60% -> pool
        uint256 pool = poc.accruedPool();
        assertGt(pool, 0, "pool accrued");

        poc.pumpPool(); // anyone may call
        assertEq(poc.accruedPool(), 0, "pool flushed");
        assertEq(vault.undistributed(), pool, "vault holds the dividends");

        vm.expectRevert(bytes("NOTHING"));
        poc.pumpPool();
    }

    /// `pumpPool()` without a wired vault reverts (no silent loss).
    function test_pumpPool_requiresVault() public {
        SpiritCards p2 = new SpiritCards(config, chip, "");
        p2.collectRevenue{value: 1 ether}(address(this));
        vm.expectRevert(bytes("NO_VAULT"));
        p2.pumpPool();
    }

    /// OWNERSHIP: Points admin follows Config dynamically — after a Config handover
    /// the new owner controls Points too (no frozen/deployer-locked admin).
    function test_points_owner_follows_config() public {
        assertEq(points.owner(), config.owner());
        address newOwner = address(0xBEEF);
        config.nominateOwner(newOwner);
        vm.prank(newOwner);
        config.acceptOwnership();
        assertEq(points.owner(), newOwner, "points owner follows config");
    }
}
