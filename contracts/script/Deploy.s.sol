// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Config} from "../src/Config.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault, INFT} from "../src/StakeVault.sol";
import {Battle} from "../src/Battle.sol";
import {Points} from "../src/Points.sol";
import {Packs} from "../src/Packs.sol";

/// @title Deploy — весь POC-стек одним скриптом + прошивка зависимостей.
/// @dev Usage (testnet / mainnet):
///   PRIVATE_KEY=<deployer> TREASURY=<safe> BASE_URI=<...> CONTRACT_URI=<data:...> \
///   forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
/// Ручки (цена/сложность/сплит) после деплоя крутятся через Config (Safe).
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envAddress("TREASURY");
        string memory uri = vm.envString("BASE_URI");
        string memory contractUri = vm.envString("CONTRACT_URI");

        vm.startBroadcast();

        Config config = new Config();
        ChipToken chip = new ChipToken();
        SpiritCards poc = new SpiritCards(config, chip, uri);
        StakeVault vault = new StakeVault(config, INFT(address(poc)));
        Battle battle = new Battle(config, poc);
        Points points = new Points(config);
        Packs packs = new Packs(config, poc);

        chip.setMinter(address(poc));
        poc.setPointsContract(address(points));
        vault.setPointsContract(address(points));
        battle.setPointsContract(address(points));
        points.setAuthorized(address(poc), true);
        points.setAuthorized(address(vault), true);
        points.setAuthorized(address(battle), true);
        poc.setPackMinter(address(packs));

        // Collection-level metadata for marketplaces (OpenSea reads contractURI(); EIP-7572).
        poc.setContractURI(contractUri);

        // Staked cards can fight: wire Vault <-> Battle both ways.
        battle.setVault(address(vault));
        vault.setBattle(address(battle));

        // Dividends keeper: point the core at the vault so pumpPool() can flush
        // accruedPool straight into staker rewards (permissionless).
        poc.setVault(address(vault));

        // Hand token-admin to the treasury (Safe) so no EOA keeps chip/points power.
        chip.transferOwnership(treasury);

        config.setTreasury(treasury);

        vm.stopBroadcast();

        console2.log("deployer   ", deployer);
        console2.log("treasury   ", treasury);
        console2.log("Config     ", address(config));
        console2.log("ChipToken  ", address(chip));
        console2.log("SpiritCards", address(poc));
        console2.log("StakeVault ", address(vault));
        console2.log("Battle     ", address(battle));
        console2.log("Points     ", address(points));
        console2.log("Packs      ", address(packs));
        console2.log("contractURI bytes", bytes(contractUri).length);
        console2.log("== next: deployer -> nomineeOwner(Safe); Safe -> acceptOwnership; deploy->pause->configure->unpause");
    }
}
