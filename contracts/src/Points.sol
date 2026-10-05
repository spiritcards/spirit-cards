// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Config} from "./Config.sol";

/// @title Points — очки активности + лидерборд (攀比).
/// @notice Очки начисляют авторизованные модули (SpiritCards, StakeVault, Battle).
///         Ставки очков — в Config. Сезонность — офчейн (по снапшотам), лидерборд читается отсюда.
///         Админ = владелец Config (динамически): после хендовера Config на Safe админ
///         Points тоже переезжает на Safe — ранневладельца больше нет.
contract Points {
    Config public immutable config;

    mapping(address => bool) public authorized;
    mapping(address => uint256) public points;

    event PointsAdded(address indexed user, uint256 amount, bytes32 reason);
    event AuthorizedSet(address indexed who, bool ok);

    modifier onlyOwner() {
        require(msg.sender == config.owner(), "NOT_OWNER");
        _;
    }

    constructor(Config _config) {
        config = _config;
    }

    /// @notice Владелец Points всегда = владелец Config (динамически, не снапшот).
    function owner() public view returns (address) {
        return config.owner();
    }

    function setAuthorized(address who, bool ok) external onlyOwner {
        authorized[who] = ok;
        emit AuthorizedSet(who, ok);
    }

    function addPoints(address user, uint256 amount, bytes32 reason) external {
        require(authorized[msg.sender] || msg.sender == config.owner(), "NOT_AUTH");
        points[user] += amount;
        emit PointsAdded(user, amount, reason);
    }
}
