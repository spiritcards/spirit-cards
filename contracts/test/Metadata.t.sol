// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";

/// @notice Marketplace-метаданные (OpenSea): ончейн-ребренд, ERC-173 owner(),
///         EIP-7572 contractURI(), ERC-4906 setBaseURI().
contract MetadataTest is Test {
    Config config;
    ChipToken chip;
    SpiritCards poc;

    address alice = address(0xA11CE);

    event ContractURIUpdated();
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    function setUp() public {
        vm.warp(1_000_000); // non-zero time so cooldown math works from first mine
        config = new Config();
        config.setMining(8, 0, 250, 600); // лёгкая сложность, без cooldown, эпоха 600с
        config.setPricing(0.001 ether, 2500, 1000);
        config.setSplit(6000, 1000, 3000, 0);
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

    // ------------------------------------------------------------------
    // Ребренд: Spirit Cards / SPC
    // ------------------------------------------------------------------

    function testRebrand_nameAndSymbol() public {
        assertEq(poc.name(), "Spirit Cards");
        assertEq(poc.symbol(), "SPC");
    }

    // ------------------------------------------------------------------
    // ERC-173 owner(): динамически = Config.owner()
    // ------------------------------------------------------------------

    function testOwner_mirrorsConfigOwner() public {
        assertEq(poc.owner(), address(this), "deployer is owner at start");

        config.nominateOwner(alice);
        assertEq(poc.owner(), address(this), "pendingOwner is not owner yet");

        vm.prank(alice);
        config.acceptOwnership();
        assertEq(poc.owner(), alice, "mirrors Config owner after handover");
    }

    // ------------------------------------------------------------------
    // EIP-7572 contractURI()
    // ------------------------------------------------------------------

    function testContractURI_emptyByDefault() public {
        assertEq(poc.contractURI(), "");
    }

    function testSetContractURI_storesAndEmits() public {
        string memory uri = "data:application/json;base64,eyJuYW1lIjoiU3Bpcml0IENhcmRzIn0=";

        vm.expectEmit(true, true, true, true);
        emit ContractURIUpdated();
        poc.setContractURI(uri);

        assertEq(poc.contractURI(), uri);
    }

    function testSetContractURI_onlyConfigOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_OWNER"));
        poc.setContractURI("data:,x");
    }

    function testSetContractURI_followsHandover() public {
        config.nominateOwner(alice);
        vm.prank(alice);
        config.acceptOwnership();

        // Старый владелец больше не может.
        vm.expectRevert(bytes("NOT_OWNER"));
        poc.setContractURI("data:,old");

        // Новый — может.
        vm.prank(alice);
        poc.setContractURI("data:,new");
        assertEq(poc.contractURI(), "data:,new");
    }

    // ------------------------------------------------------------------
    // ERC-4906 setBaseURI()
    // ------------------------------------------------------------------

    function testSetBaseURI_updatesTokenURI_andEmits() public {
        uint256 nonce = _findNonce(address(this), config.baseBits());
        poc.mine{value: poc.currentPrice()}(nonce, false);
        assertEq(poc.tokenURI(1), "https://example.invalid/poc/1");

        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(0, type(uint256).max);
        poc.setBaseURI("https://spiritcards.fun/api/meta/");

        assertEq(poc.baseURI(), "https://spiritcards.fun/api/meta/");
        assertEq(poc.tokenURI(1), "https://spiritcards.fun/api/meta/1");
    }

    function testSetBaseURI_onlyConfigOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_OWNER"));
        poc.setBaseURI("https://evil.example/");
    }
}
