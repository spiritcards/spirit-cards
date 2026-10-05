// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ReentrancyGuard — минимальный guard (без внешних зависимостей).
/// @notice Защищает функции, которые шлют ETH наружу или двигают состояние карт.
abstract contract ReentrancyGuard {
    uint256 private _reentrancyStatus = 1;

    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "REENTRANT");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }
}
