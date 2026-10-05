// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Config — тюнябельные параметры Proof of Card (урок S1: ядро НЕ иммутабельное).
/// @notice Владелец = Safe (позже). Все параметры меняются вручную (крутить ручку) — включая сложность.
///         Значения — черновики (round-2/3 решения), калибруются замерами (docs 03/08/13).
contract Config {
    address public owner;
    address public pendingOwner;
    bool public paused;

    // --- mining (baseBits — РУЧНОЙ регулятор темпа; храповика нет) ---
    uint256 public baseBits = 20;        // сложность: поднимаешь = медленнее, опускаешь = быстрее
    uint256 public bitsStepX100 = 33;    // +0.33 бита за ценовую эру (сотые доли бита; целые биты on-chain)
    uint256 public mineCooldown = 45;    // сек на кошелёк
    uint256 public epochCap = 1000;      // макс. карт за эпоху (ручка темпа; поднимаем в наплыв)
    uint256 public epochLength = 3600;   // длина эпохи, сек (почасовой лимит)

    // --- pricing (старт ~$1, +25% за эру — мягко, без x2) ---
    uint256 public eraPrice = 0.00037 ether;  // ≈$1 при ETH≈$2700 (пересчёт 05.10)
    uint256 public priceStepBps = 2500;       // +25% за эру
    uint256 public eraSize = 1111;            // карт на ценовую эру (8 эр × 1111 = 8888)
    uint256 public packPriceBps = 20000;      // пак: цена карты ×2 к цене минта (20000 bps); скидки объёма — в Packs

    // --- chip ---
    uint256 public chipDiscountBps = 3000;    // -30%

    // --- merge ---
    uint256 public mergeFee = 0.00002 ether;
    uint256 public mergeFailBps = 700;        // 7% "пустой" мёрдж (анти-арбитраж)

    // --- revenue split (R3: pool 60 / referral 10 / treasury 30 / reserve 0) ---
    uint256 public poolBps = 6000;
    uint256 public referralBps = 1000;
    uint256 public houseBps = 3000;
    uint256 public reserveBps = 0;

    // --- supply / battle ---
    uint256 public maxSupply = 8888;     // R3: финальный тираж
    uint256 public lives = 3;            // стартовые "жизни" карты (❤)
    uint256 public pvpRakeBps = 1000;    // 10% рейк дуэли (банк)
    uint256 public rakeToPoolBps = 3000; // 30% рейка -> пул стейкеров, остальные 70% -> касса (treasury)

    // --- battle v2 (elements + per-battle roll): outcome is a gamble, not a sure thing ---
    uint256 public typeAdvBps = 2000;    // ±20% element advantage/disadvantage (rock-paper-scissors, 4 elements)
    uint256 public atkVarianceBps = 4000; // ±40% per-battle attack roll: ~+25% card wins ~72%, so underdog still wins ~28% (tunable)

    // --- referral master (hidden team cut inside the 10% referral pool) ---
    uint256 public masterRefBps = 300;   // 3% of gross -> master ref (fixed upline for EVERY payer)

    // --- royalty (ERC-2981, вторичка -> treasury) ---
    uint256 public royaltyBps = 500;     // 5%

    // --- official addresses ---
    address public treasury;             // касса (команда+маркетинг)

    // --- staking tiers (t0 flexible + 5 lock tiers) ---
    uint256 public constant TIER_COUNT = 6;
    uint256[6] public tierLock = [uint256(0), uint256(7 days), uint256(30 days), uint256(90 days), uint256(180 days), uint256(365 days)];
    uint256[6] public tierWeightX1000 = [uint256(1000), uint256(5000), uint256(10000), uint256(20000), uint256(30000), uint256(40000)];

    // --- points (лидерборд) ---
    uint256 public pointsMine = 1;
    uint256 public pointsMerge = 2;
    uint256 public pointsStake = 2;
    uint256 public pointsPvpWin = 3;

    event OwnerNominated(address indexed pending);
    event OwnershipTransferred(address indexed from, address indexed to);
    event PausedSet(bool paused);
    event ConfigChanged(bytes32 indexed key, uint256 oldValue, uint256 newValue);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
        treasury = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function nominateOwner(address to) external onlyOwner {
        pendingOwner = to;
        emit OwnerNominated(to);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NOT_PENDING");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }

    function _set(bytes32 key, uint256 oldV, uint256 newV) private {
        emit ConfigChanged(key, oldV, newV);
    }

    /// @notice Ручная ручка темпа: сложность + cooldown + почасовой лимит (эпоха = 1 час).
    function setMining(uint256 _baseBits, uint256 _mineCooldown, uint256 _epochCap, uint256 _epochLength) external onlyOwner {
        require(_baseBits > 0 && _baseBits < 250, "BITS");
        require(_epochCap > 0 && _epochLength > 0, "EPOCH");
        _set("baseBits", baseBits, _baseBits); baseBits = _baseBits;
        _set("mineCooldown", mineCooldown, _mineCooldown); mineCooldown = _mineCooldown;
        _set("epochCap", epochCap, _epochCap); epochCap = _epochCap;
        _set("epochLength", epochLength, _epochLength); epochLength = _epochLength;
    }

    /// @notice Difficulty ramp per price-era (hundredths of a bit; e.g. 33 = +0.33 bit/era).
    function setBitsStep(uint256 _bitsStepX100) external onlyOwner {
        require(_bitsStepX100 <= 5000, "STEP");
        _set("bitsStepX100", bitsStepX100, _bitsStepX100); bitsStepX100 = _bitsStepX100;
    }

    function setPricing(uint256 _eraPrice, uint256 _priceStepBps, uint256 _eraSize) external onlyOwner {
        require(_eraSize > 0, "ERA");
        _set("eraPrice", eraPrice, _eraPrice); eraPrice = _eraPrice;
        _set("priceStepBps", priceStepBps, _priceStepBps); priceStepBps = _priceStepBps;
        _set("eraSize", eraSize, _eraSize); eraSize = _eraSize;
    }

    /// @notice Множитель цены пака (bps от цены минта). 20000 = ×2; ≥10000 (пак не дешевле минта).
    function setPackPriceBps(uint256 _bps) external onlyOwner {
        require(_bps >= 10000, "LOW");
        _set("packPriceBps", packPriceBps, _bps); packPriceBps = _bps;
    }

    function setChipBps(uint256 _bps) external onlyOwner {
        require(_bps < 10000, "BPS");
        _set("chipDiscountBps", chipDiscountBps, _bps); chipDiscountBps = _bps;
    }

    function setMerge(uint256 _fee, uint256 _failBps) external onlyOwner {
        require(_failBps <= 3000, "FAIL");
        _set("mergeFee", mergeFee, _fee); mergeFee = _fee;
        _set("mergeFailBps", mergeFailBps, _failBps); mergeFailBps = _failBps;
    }

    function setSplit(uint256 _pool, uint256 _referral, uint256 _house, uint256 _reserve) external onlyOwner {
        require(_pool + _referral + _house + _reserve == 10000, "SPLIT");
        _set("poolBps", poolBps, _pool); poolBps = _pool;
        _set("referralBps", referralBps, _referral); referralBps = _referral;
        _set("houseBps", houseBps, _house); houseBps = _house;
        _set("reserveBps", reserveBps, _reserve); reserveBps = _reserve;
    }

    function setMaxSupply(uint256 _max) external onlyOwner {
        require(_max > 0, "MAX");
        _set("maxSupply", maxSupply, _max); maxSupply = _max;
    }

    function setLives(uint256 _lives) external onlyOwner {
        require(_lives > 0, "LIVES");
        _set("lives", lives, _lives); lives = _lives;
    }

    function setPvpRakeBps(uint256 _bps) external onlyOwner {
        require(_bps <= 3000, "RAKE");
        _set("pvpRakeBps", pvpRakeBps, _bps); pvpRakeBps = _bps;
    }

    /// @notice Battle v2 tuning: element advantage (±) and per-battle attack variance (±).
    function setBattleParams(uint256 _typeAdvBps, uint256 _atkVarianceBps) external onlyOwner {
        require(_typeAdvBps <= 5000 && _atkVarianceBps <= 5000, "RANGE");
        _set("typeAdvBps", typeAdvBps, _typeAdvBps); typeAdvBps = _typeAdvBps;
        _set("atkVarianceBps", atkVarianceBps, _atkVarianceBps); atkVarianceBps = _atkVarianceBps;
    }

    /// @notice PvP rake split: share of the rake that flows to the staker pool (rest -> treasury).
    function setRakeSplit(uint256 _rakeToPoolBps) external onlyOwner {
        require(_rakeToPoolBps <= 10000, "RANGE");
        _set("rakeToPoolBps", rakeToPoolBps, _rakeToPoolBps); rakeToPoolBps = _rakeToPoolBps;
    }

    /// @notice Master-referral cut (share of GROSS that goes to the fixed master ref).
    function setMasterRefBps(uint256 _bps) external onlyOwner {
        require(_bps <= 10000, "RANGE");
        _set("masterRefBps", masterRefBps, _bps); masterRefBps = _bps;
    }

    function setRoyalty(uint256 _bps) external onlyOwner {
        require(_bps <= 2000, "ROYALTY");
        _set("royaltyBps", royaltyBps, _bps); royaltyBps = _bps;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "TREASURY");
        treasury = _treasury;
    }

    function setStakingTier(uint256 i, uint256 _lock, uint256 _weightX1000) external onlyOwner {
        require(i < TIER_COUNT, "TIER");
        require(i == 0 || _lock > tierLock[i - 1], "ORDER"); // тиры по возрастанию блокировки
        require(_weightX1000 >= 1000, "WEIGHT");
        tierLock[i] = _lock;
        tierWeightX1000[i] = _weightX1000;
    }

    function setPoints(uint256 _mine, uint256 _merge, uint256 _stake, uint256 _pvpWin) external onlyOwner {
        pointsMine = _mine;
        pointsMerge = _merge;
        pointsStake = _stake;
        pointsPvpWin = _pvpWin;
    }
}
