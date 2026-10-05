// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {SpiritCards} from "../src/SpiritCards.sol";
import {StakeVault} from "../src/StakeVault.sol";

/// @title PumpPool — кипер: перелить накопленный пул SpiritCards в StakeVault как дивиденды.
/// @notice Двумя шагами в одной сессии: poc.withdrawPool(keeper) → vault.notifyRewards{value}.
///         Почему не напрямую poc.withdrawPool(vault): у StakeVault нет receive(), ETH-перевод
///         ревертнёт; наполнять вольт нужно через payable-вызов notifyRewards().
/// @dev Usage (owner = EOA; на тестнете так):
///   PRIVATE_KEY=<config.owner> POC=<core> VAULT=<vault> \
///   forge script script/PumpPool.s.sol --rpc-url robinhood_testnet --broadcast
///   При owner = Safe: сначала Safe-tx → poc.withdrawPool(<ops>), затем из <ops> вызвать
///   vault.notifyRewards{value: amount}() (этот скрипт для Safe напрямую не сработает).
contract PumpPool is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);
        SpiritCards poc = SpiritCards(payable(vm.envAddress("POC")));
        StakeVault vault = StakeVault(vm.envAddress("VAULT"));

        require(poc.config().owner() == owner, "PRIVATE_KEY is not config owner");

        uint256 pool = poc.accruedPool();
        console2.log("accruedPool ", pool);
        require(pool > 0, "pool empty");

        vm.startBroadcast();
        poc.withdrawPool(owner);              // pool ETH -> keeper
        vault.notifyRewards{value: pool}();   // keeper -> StakeVault (dividends)
        vm.stopBroadcast();

        console2.log("forwarded to StakeVault", pool);
    }
}
