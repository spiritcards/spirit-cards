// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Config} from "./Config.sol";
import {Points} from "./Points.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";

interface INFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function burnCard(uint256 tokenId) external;
}

/// @title StakeVault — банк карт + дивиденды из пула (回本).
/// @notice Карту депонируем в волт (хард-лок по тиру), получаем долю пула по весу.
///         Пул наполняется через notifyRewards() (из SpiritCards.accruedPool + внешние рейки).
///         Пока в волте есть стейки — реварды распределяются мгновенно по весу (lump-sum модель).
///         Стейкнутая карта недоступна для боя (она во владении волта) — снимается это естественно.
contract StakeVault is ReentrancyGuard {
    Config public immutable config;
    INFT public immutable nft;
    Points public points; // setlater; null-safe

    struct Stake {
        address user;
        uint256 tier;
        uint256 weight;      // tierWeightX1000
        uint256 stakedAt;
        uint256 rewardDebt;  // weight * acc / 1e18 на момент стейка
        bool active;
    }

    mapping(uint256 => Stake) public stakes;
    uint256 public totalWeight;
    uint256 public accRewardPerWeight; // масштаб 1e18
    uint256 public undistributed;      // копится, если стейкеров нет

    /// @notice Battle module allowed to lock staked cards into duels (set by owner).
    address public battle;
    /// @notice tokenId => currently escrowed into a duel (card stays in the vault).
    mapping(uint256 => bool) public inBattle;

    event Staked(address indexed user, uint256 indexed tokenId, uint256 tier, uint256 weight);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardsNotified(uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed tokenId, uint256 amount);
    event PointsHook(address indexed user, uint256 amount);
    event BattleSet(address indexed battle);
    event LockedForBattle(uint256 indexed tokenId, address indexed staker);
    event UnlockedFromBattle(uint256 indexed tokenId);
    event KilledInBattle(uint256 indexed tokenId, address indexed staker);

    constructor(Config _config, INFT _nft) {
        config = _config;
        nft = _nft;
    }

    modifier notPaused() {
        require(!config.paused(), "PAUSED");
        _;
    }

    modifier onlyBattle() {
        require(battle != address(0) && msg.sender == battle, "NOT_BATTLE");
        _;
    }

    /// @notice Внести реварды в пул (дивиденды). Если стейкеров нет — копим в undistributed.
    function notifyRewards() external payable nonReentrant {
        require(msg.value > 0, "ZERO");
        if (totalWeight == 0) {
            undistributed += msg.value;
        } else {
            uint256 amt = msg.value + undistributed;
            undistributed = 0;
            accRewardPerWeight += (amt * 1e18) / totalWeight;
        }
        emit RewardsNotified(msg.value);
    }

    function stake(uint256 tokenId, uint256 tier) external notPaused nonReentrant {
        require(tier < config.TIER_COUNT(), "TIER");
        require(nft.ownerOf(tokenId) == msg.sender, "NOT_OWNER");
        require(!stakes[tokenId].active, "STAKED");

        nft.transferFrom(msg.sender, address(this), tokenId);

        uint256 weight = config.tierWeightX1000(tier);
        uint256 debt = _mulDivCeil(weight, accRewardPerWeight, 1e18); // acc ДО распределения undistributed
        totalWeight += weight;
        // распределить накопившееся, если ранее не было стейкеров (первый стейкер забирает)
        if (undistributed > 0) {
            accRewardPerWeight += (undistributed * 1e18) / totalWeight;
            undistributed = 0;
        }
        stakes[tokenId] = Stake({
            user: msg.sender,
            tier: tier,
            weight: weight,
            stakedAt: block.timestamp,
            rewardDebt: debt,
            active: true
        });
        emit Staked(msg.sender, tokenId, tier, weight);
        emit PointsHook(msg.sender, config.pointsStake());
        if (address(points) != address(0)) points.addPoints(msg.sender, config.pointsStake(), "STAKE");
    }

    function setPointsContract(address _points) external {
        require(msg.sender == config.owner(), "NOT_OWNER");
        points = Points(_points);
    }

    /// @notice Authorize the Battle module (owner). It may lock staked cards into duels.
    function setBattle(address _battle) external {
        require(msg.sender == config.owner(), "NOT_OWNER");
        battle = _battle;
        emit BattleSet(_battle);
    }

    /// @notice Beneficial owner of a staked card (address(0) if not staked).
    function stakerOf(uint256 tokenId) external view returns (address) {
        Stake memory s = stakes[tokenId];
        return s.active ? s.user : address(0);
    }

    /// @notice Battle locks a staked card for a duel. The card stays in the vault
    ///         (но недоступна для unstake/другого боя, пока идёт дуэль).
    function lockForBattle(uint256 tokenId, address staker) external onlyBattle {
        Stake storage s = stakes[tokenId];
        require(s.active && s.user == staker, "NOT_STAKER");
        require(!inBattle[tokenId], "IN_BATTLE");
        inBattle[tokenId] = true;
        emit LockedForBattle(tokenId, staker);
    }

    /// @notice Card survived a duel: unlock it (still staked, still in the vault).
    function unlockFromBattle(uint256 tokenId) external onlyBattle {
        require(inBattle[tokenId], "NOT_IN_BATTLE");
        inBattle[tokenId] = false;
        emit UnlockedFromBattle(tokenId);
    }

    /// @notice Card lost its last life in a duel: burn it, settle its pending
    ///         rewards to the staker and clear the stake. Battle calls this.
    function killInBattle(uint256 tokenId) external onlyBattle nonReentrant {
        Stake memory s = stakes[tokenId];
        require(inBattle[tokenId] && s.active, "NOT_IN_BATTLE");
        require(nft.ownerOf(tokenId) == address(this), "NOT_HELD");

        uint256 p = pending(tokenId);
        inBattle[tokenId] = false;
        totalWeight -= s.weight;
        delete stakes[tokenId];

        if (p > 0) {
            (bool ok,) = s.user.call{value: p}("");
            require(ok, "XFER");
            emit RewardClaimed(s.user, tokenId, p);
        }
        nft.burnCard(tokenId);
        emit KilledInBattle(tokenId, s.user);
    }

    /// @notice Застейкать НЕСКОЛЬКО карт ОДНОЙ транзакцией, один тир на всю пачку.
    ///         Атомарно: если хоть одна карта не своя / уже застейкана — весь вызов ревертит.
    function stakeBatch(uint256[] calldata tokenIds, uint256 tier) external notPaused nonReentrant {
        require(tier < config.TIER_COUNT(), "TIER");
        uint256 n = tokenIds.length;
        require(n > 0, "EMPTY");

        uint256 wgt = config.tierWeightX1000(tier);
        uint256 debt = _mulDivCeil(wgt, accRewardPerWeight, 1e18); // acc ДО распределения undistributed

        for (uint256 i = 0; i < n; i++) {
            uint256 tokenId = tokenIds[i];
            require(nft.ownerOf(tokenId) == msg.sender, "NOT_OWNER");
            require(!stakes[tokenId].active, "STAKED");

            nft.transferFrom(msg.sender, address(this), tokenId);
            totalWeight += wgt;
            stakes[tokenId] = Stake({
                user: msg.sender,
                tier: tier,
                weight: wgt,
                stakedAt: block.timestamp,
                rewardDebt: debt,
                active: true
            });
            emit Staked(msg.sender, tokenId, tier, wgt);
        }

        if (undistributed > 0) {
            accRewardPerWeight += (undistributed * 1e18) / totalWeight;
            undistributed = 0;
        }

        uint256 pts = config.pointsStake() * n;
        emit PointsHook(msg.sender, pts);
        if (address(points) != address(0)) points.addPoints(msg.sender, pts, "STAKE");
    }

    function pending(uint256 tokenId) public view returns (uint256) {
        Stake memory s = stakes[tokenId];
        if (!s.active) return 0;
        uint256 accrued = (s.weight * accRewardPerWeight) / 1e18;
        return accrued > s.rewardDebt ? accrued - s.rewardDebt : 0; // debt округлён вверх -> floor на 0
    }

    function claim(uint256 tokenId) external nonReentrant {
        require(stakes[tokenId].active && stakes[tokenId].user == msg.sender, "NOT_STAKER");
        _claim(tokenId);
    }

    function unstake(uint256 tokenId) external nonReentrant {
        Stake memory s = stakes[tokenId];
        require(s.active && s.user == msg.sender, "NOT_STAKER");
        require(!inBattle[tokenId], "IN_BATTLE");
        require(block.timestamp >= s.stakedAt + config.tierLock(s.tier), "LOCKED");

        _claim(tokenId);
        totalWeight -= s.weight;
        delete stakes[tokenId];
        nft.transferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(msg.sender, tokenId);
    }

    /// @notice Забрать награды СРАЗУ по нескольким позициям одной транзакцией.
    function claimBatch(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0, "EMPTY");
        for (uint256 i = 0; i < n; i++) {
            uint256 id = tokenIds[i];
            require(stakes[id].active && stakes[id].user == msg.sender, "NOT_STAKER");
            _claim(id);
        }
    }

    /// @notice Снять НЕСКОЛЬКО карт одной транзакцией. Атомарно: если хоть одна ещё в
    ///         локе (LOCKED) — ревертит весь вызов, поэтому UI шлёт только разблокированные.
    function unstakeBatch(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0, "EMPTY");
        for (uint256 i = 0; i < n; i++) {
            uint256 id = tokenIds[i];
            Stake memory s = stakes[id];
            require(s.active && s.user == msg.sender, "NOT_STAKER");
            require(!inBattle[id], "IN_BATTLE");
            require(block.timestamp >= s.stakedAt + config.tierLock(s.tier), "LOCKED");

            _claim(id);
            totalWeight -= s.weight;
            delete stakes[id];
            nft.transferFrom(address(this), msg.sender, id);
            emit Unstaked(msg.sender, id);
        }
    }

    /// @dev ceil(a*b/d) — reward debt округляем ВВЕРХ, чтобы pending стейкера не превышал
    ///      его точную долю (убивает 1-wei «недосчёт» солвентности, пойманный invariant-фаззом).
    function _mulDivCeil(uint256 a, uint256 b, uint256 d) internal pure returns (uint256) {
        return (a * b + d - 1) / d;
    }

    function _claim(uint256 tokenId) internal {
        uint256 p = pending(tokenId);
        if (p > 0) {
            stakes[tokenId].rewardDebt += p;
            (bool ok,) = stakes[tokenId].user.call{value: p}("");
            require(ok, "XFER");
            emit RewardClaimed(stakes[tokenId].user, tokenId, p);
        }
    }
}
