// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Config} from "./Config.sol";
import {SpiritCards} from "./SpiritCards.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";

/// @title Packs — покупка паков карт (拆卡). Размеры 5/10/25/50/100, нарастающий дисконт.
/// @notice Покупка → минт N карт покупателю (SpiritCards.mintPack, обход PoW), выручка идёт
///         через общий сплит SpiritCards.collectRevenue (pool/referral/treasury).
///         Pity (保底) — счётчик пуков; редкость определяется офчейн из сида, поэтому сброс —
///         по событию/владельцу (resetPity). Публичный pull-rate — офчейн-дашборд.
contract Packs is ReentrancyGuard {
    Config public immutable config;
    SpiritCards public immutable poc;

    uint256 public constant NUM = 5;
    uint256[5] public size = [uint256(5), uint256(10), uint256(25), uint256(50), uint256(100)];
    uint256[5] public discountBps = [uint256(300), uint256(600), uint256(1200), uint256(2000), uint256(3000)];

    mapping(address => uint256) public packsBought;
    mapping(address => uint256) public pity; // пуков с последнего «редкого» (advisory)

    event PackOpened(address indexed buyer, uint256 size, uint256 firstId, uint256 paid, uint256 discountBps);
    event DiscountSet(uint256 i, uint256 bps);
    event PityReset(address indexed user);

    constructor(Config _config, SpiritCards _poc) {
        config = _config;
        poc = _poc;
    }

    modifier onlyOwner() {
        require(msg.sender == config.owner(), "NOT_OWNER");
        _;
    }

    function setDiscount(uint256 i, uint256 bps) external onlyOwner {
        require(i < NUM && bps < 10000, "BAD");
        discountBps[i] = bps;
        emit DiscountSet(i, bps);
    }

    /// @notice Цена пака i: цена карты × packPriceBps (×2 к минту) × N − скидка за объём.
    ///         Пак — премиальный способ пропустить PoW: карта дороже минта, скидка растёт с размером.
    function priceFor(uint256 i) public view returns (uint256) {
        require(i < NUM, "IDX");
        uint256 unit = (poc.currentPrice() * config.packPriceBps()) / 10000;
        uint256 base = unit * size[i];
        return base - (base * discountBps[i]) / 10000;
    }

    /// @notice Купить пак i: оплатить priceFor(i), получить size[i] карт.
    function buyPack(uint256 i) external payable nonReentrant {
        require(!config.paused(), "PAUSED");
        require(i < NUM, "IDX");
        uint256 p = priceFor(i);
        require(msg.value == p, "BAD_PAY");

        uint256 firstId = poc.mintPack(msg.sender, size[i]);
        packsBought[msg.sender] += 1;
        pity[msg.sender] += 1;

        if (msg.value > 0) poc.collectRevenue{value: msg.value}(msg.sender);

        emit PackOpened(msg.sender, size[i], firstId, p, discountBps[i]);
    }

    function resetPity(address user) external onlyOwner {
        pity[user] = 0;
        emit PityReset(user);
    }
}
