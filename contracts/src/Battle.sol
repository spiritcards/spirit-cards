// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Config} from "./Config.sol";
import {SpiritCards} from "./SpiritCards.sol";
import {StakeVault} from "./StakeVault.sol";
import {Points} from "./Points.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";

/// @title Battle — PvP v2: дуэль-эскроу на ставку с ЭЛЕМЕНТАМИ, СКИЛЛАМИ и разбросом.
/// @notice Оба ставят карту + ETH. Победитель забирает банк минус рейк (рейк -> пул).
///         Проигравший теряет 1 «жизнь» карты; 0 жизней -> burn (sink). История W/L на карте.
///
///  Исход НЕ является гарантией по статам: у каждой карты есть
///    • СТИХИЯ (element 0..3) с преимуществом «камень-ножницы-бумага» (± typeAdvBps),
///    • СКИЛЛ (skill 0..5: crit / shield / pierce / precision / vigor),
///    • и разброс атаки на бой (± atkVarianceBps) от block.prevrandao.
///  Поэтому равные по силе карты — почти монетка, а более слабая карта всё равно может
///  выиграть. Точный исход tакже зависит от prevrandao БУДУЩЕГО блока acceptDuel, который
///  принимающий не знает в момент подписи → «непонятно, пока не вступил». [см. audit F-4/F-5]
contract Battle is ReentrancyGuard {
    Config public immutable config;
    SpiritCards public immutable poc;
    Points public points; // setlater; null-safe
    StakeVault public vault; // setlater (setVault); enables fighting with staked cards

    struct Duel {
        address a;
        uint256 cardA;
        uint256 stake;
        bool open;
        bool aFromVault; // cardA was staked in the vault (not escrowed here)
    }

    mapping(uint256 => Duel) public duels;
    uint256 public duelCount;

    mapping(uint256 => uint256) public livesOf; // 0 => default config.lives()
    mapping(uint256 => bool) public burned;     // true once the card ran out of lives
    mapping(uint256 => uint256) public wins;
    mapping(uint256 => uint256) public losses;

    // --- battle v2 constants ---
    uint8 internal constant ELEMENT_COUNT = 4; // 0 Ember > 1 Stone > 2 Gale > 3 Tide > 0 Ember
    uint8 internal constant SKILL_NONE = 0;
    uint8 internal constant SKILL_CRIT = 1;      // 20% chance to deal x2
    uint8 internal constant SKILL_SHIELD = 2;    // incoming damage -30%
    uint8 internal constant SKILL_PIERCE = 3;    // ignores defender DEF
    uint8 internal constant SKILL_PRECISION = 4; // +15% damage always
    uint8 internal constant SKILL_VIGOR = 5;     // +20% max HP

    event DuelCreated(uint256 indexed id, address indexed a, uint256 cardA, uint256 stake);
    event DuelResolved(uint256 indexed id, address indexed winner, uint256 winCard, uint256 loseCard, uint256 payout, uint256 rake);
    event DuelCancelled(uint256 indexed id, address indexed a, uint256 cardA, uint256 stake);
    event CardBurned(uint256 indexed card, address indexed owner);
    /// @notice Rich result for the UI/replay: elements, skills and the winner.
    event DuelDetail(uint256 indexed id, uint8 elA, uint8 elB, uint8 skA, uint8 skB, bool aWins);

    constructor(Config _config, SpiritCards _poc) {
        config = _config;
        poc = _poc;
    }

    function lives(uint256 card) public view returns (uint256) {
        if (burned[card]) return 0; // dead card reports 0 (not the default)
        uint256 l = livesOf[card];
        return l == 0 ? config.lives() : l;
    }

    function setPointsContract(address _points) external {
        require(msg.sender == config.owner(), "NOT_OWNER");
        points = Points(_points);
    }

    /// @notice Wire the StakeVault so staked cards can fight (owner). See _escrow.
    function setVault(address _vault) external {
        require(msg.sender == config.owner(), "NOT_OWNER");
        vault = StakeVault(_vault);
    }

    /// @dev True when `card` is staked in the vault by `who` (card custodied by vault).
    function _stakedBy(uint256 card, address who) internal view returns (bool) {
        return address(vault) != address(0) && poc.ownerOf(card) == address(vault)
            && vault.stakerOf(card) == who;
    }

    /// @dev Take a card into a duel. A wallet-owned card is escrowed here; a staked
    ///      card is only LOCKED inside the vault (it never leaves custody), so a
    ///      staker can keep earning and never needs NFT approval for the battle.
    ///      Returns true when the card came from the vault.
    function _escrow(uint256 card, address who) internal returns (bool fromVault) {
        if (poc.ownerOf(card) == who) {
            poc.transferFrom(who, address(this), card);
            return false;
        }
        if (_stakedBy(card, who)) {
            vault.lockForBattle(card, who);
            return true;
        }
        revert("NOT_OWNER");
    }

    /// @dev Return a surviving card to its holder after a duel (win or life loss).
    function _release(uint256 card, address holder, bool fromVault) internal {
        if (fromVault) {
            vault.unlockFromBattle(card); // stays staked in the vault
        } else {
            poc.transferFrom(address(this), holder, card);
        }
    }

    /// @dev Burn a card that ran out of lives. A vault card is burned by the vault
    ///      (which also settles the staker's pending rewards and clears the stake).
    function _kill(uint256 card, address holder, bool fromVault) internal {
        if (fromVault) {
            vault.killInBattle(card);
        } else {
            poc.burnCard(card); // this contract holds the card in escrow
        }
        livesOf[card] = 0;
        burned[card] = true;
        emit CardBurned(card, holder);
    }

    /// @notice Создать открытую дуэль: внести свою карту + ставку в эскроу.
    function createDuel(uint256 cardA, uint256 stake) external payable nonReentrant returns (uint256 id) {
        require(!config.paused(), "PAUSED");
        require(stake > 0 && msg.value == stake, "STAKE");
        bool fromVault = _escrow(cardA, msg.sender);
        id = ++duelCount;
        duels[id] = Duel({a: msg.sender, cardA: cardA, stake: stake, open: true, aFromVault: fromVault});
        emit DuelCreated(id, msg.sender, cardA, stake);
    }

    /// @notice Отменить свою открытую дуэль: вернуть карту и ставку создателю.
    function cancelDuel(uint256 id) external nonReentrant {
        Duel storage d = duels[id];
        require(d.open, "CLOSED");
        require(msg.sender == d.a, "NOT_CREATOR");
        d.open = false;
        uint256 card = d.cardA;
        address a = d.a;
        uint256 stake = d.stake;
        _release(card, a, d.aFromVault);
        (bool ok,) = a.call{value: stake}("");
        require(ok, "XFER");
        emit DuelCancelled(id, a, card, stake);
    }

    /// @notice Принять дуэль: внести свою карту + такую же ставку; бой разрешается сразу.
    function acceptDuel(uint256 id, uint256 cardB) external payable nonReentrant {
        require(!config.paused(), "PAUSED");
        Duel storage d = duels[id];
        require(d.open, "CLOSED");
        require(msg.sender != d.a, "SELF");
        require(msg.value == d.stake, "STAKE");
        bool bFromVault = _escrow(cardB, msg.sender);
        d.open = false;
        bool aWins = _resolve(d.cardA, cardB, id);
        _settle(d, id, cardB, msg.sender, bFromVault, aWins);
    }

    /// @dev Duel rake: rakeToPoolBps of it -> staker pool, the rest -> treasury (team).
    function _payRake(uint256 rake) internal {
        if (rake == 0) return;
        uint256 toPool = (rake * config.rakeToPoolBps()) / 10000;
        uint256 toHouse = rake - toPool;
        if (toPool > 0) poc.addToPool{value: toPool}();
        if (toHouse > 0) {
            (bool ok,) = payable(config.treasury()).call{value: toHouse}("");
            require(ok, "XFER");
        }
    }

    /// @dev Split out of acceptDuel to keep the stack shallow.
    function _settle(
        Duel storage d,
        uint256 id,
        uint256 cardB,
        address b,
        bool bFromVault,
        bool aWins
    ) internal {
        emit DuelDetail(id, elementOf(d.cardA), elementOf(cardB), skillOf(d.cardA), skillOf(cardB), aWins);

        uint256 pot = d.stake * 2;
        uint256 rake = (pot * config.pvpRakeBps()) / 10000;
        address winner = aWins ? d.a : b;
        uint256 winCard = aWins ? d.cardA : cardB;
        uint256 loseCard = aWins ? cardB : d.cardA;

        wins[winCard] += 1;
        losses[loseCard] += 1;

        _payRake(rake);

        _release(winCard, winner, aWins ? d.aFromVault : bFromVault);
        _loseLife(loseCard, aWins ? b : d.a, aWins ? bFromVault : d.aFromVault);

        if (address(points) != address(0)) points.addPoints(winner, config.pointsPvpWin(), "PVP_WIN");

        uint256 payout = pot - rake;
        (bool ok,) = winner.call{value: payout}("");
        require(ok, "XFER");

        emit DuelResolved(id, winner, winCard, loseCard, payout, rake);
    }

    // ------------------------------------------------------------------
    // Battle profile — deterministic from the card's on-chain seed (single source of truth)
    // ------------------------------------------------------------------

    /// @notice Базовые статы карты. rarity 0..5 (N/R/SR/UR/SSR/Prism) из верхнего байта.
    function statsOf(uint256 card) public view returns (uint256 hp, uint256 atk, uint256 def, uint256 rarity) {
        uint256 s = uint256(poc.seedOf(card));
        rarity = (s >> 248) % 6;
        atk = 8 + ((s >> 240) & 0xFF) % 20 + rarity * 4;   // 8..27 + rarity bonus
        def = 4 + ((s >> 232) & 0xFF) % 16 + rarity * 3;   // 4..19 + rarity bonus
        hp  = 50 + ((s >> 224) & 0xFF) % 100 + rarity * 15; // 50..149 + rarity bonus
    }

    /// @notice Стихия карты (0..3): 0 Ember > 1 Stone > 2 Gale > 3 Tide > 0 Ember.
    function elementOf(uint256 card) public view returns (uint8) {
        return uint8((uint256(poc.seedOf(card)) >> 216) & 0x03);
    }

    /// @notice Скилл карты (0..5): 0 none, 1 crit, 2 shield, 3 pierce, 4 precision, 5 vigor.
    function skillOf(uint256 card) public view returns (uint8) {
        return uint8((uint256(poc.seedOf(card)) >> 208) % 6);
    }

    /// @notice Человекочитаемый «боевой профиль» для UI (element/skill — числа, имена офчейн).
    function profileOf(uint256 card)
        external
        view
        returns (uint256 hp, uint256 atk, uint256 def, uint256 rarity, uint8 element, uint8 skill)
    {
        (hp, atk, def, rarity) = statsOf(card);
        element = elementOf(card);
        skill = skillOf(card);
    }

    /// @notice Предпросмотр исхода по ТЕКУЩЕМУ block.prevrandao (для UI/тестов).
    ///         Реальный acceptDuel использует prevrandao блока-исполнителя, поэтому это
    ///         лишь один возможный исход, а не гарантия.
    function preview(uint256 a, uint256 b, uint256 id) external view returns (bool aWins) {
        return _resolve(a, b, id);
    }

    // ------------------------------------------------------------------
    // Resolution v2: elements + skills + per-battle variance
    // ------------------------------------------------------------------

    function _initRng(uint256 a, uint256 b, uint256 id) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            poc.seedOf(a), poc.seedOf(b), id, block.prevrandao, address(this)
        )));
    }

    /// @dev Бой по статам + стихии + скиллу + разбросу. Сильная карта обычно выигрывает,
    ///      но близкие карты решает случай, и даже более слабая может затащить.
    ///      Реализовано на memory-массивах, чтобы не переполнить стек.
    function _resolve(uint256 a, uint256 b, uint256 id) internal view returns (bool aWins) {
        uint256[2] memory hp;
        uint256[2] memory atk;
        uint256[2] memory def;
        uint256[2] memory mlt;
        uint8[2] memory sk;

        (hp[0], atk[0], def[0], ) = statsOf(a);
        (hp[1], atk[1], def[1], ) = statsOf(b);
        sk[0] = skillOf(a);
        sk[1] = skillOf(b);

        uint256 rng = _initRng(a, b, id);
        uint256 varBps = config.atkVarianceBps();
        (atk[0], rng) = _roll(atk[0], varBps, rng);
        (atk[1], rng) = _roll(atk[1], varBps, rng);
        (mlt[0], mlt[1]) = _elementMult(elementOf(a), elementOf(b));

        // vigor: +20% HP
        if (sk[0] == SKILL_VIGOR) hp[0] = (hp[0] * 120) / 100;
        if (sk[1] == SKILL_VIGOR) hp[1] = (hp[1] * 120) / 100;
        uint256[2] memory startHp;
        startHp[0] = hp[0];
        startHp[1] = hp[1];

        for (uint256 round = 0; round < 64; round++) {
            rng = uint256(keccak256(abi.encodePacked(rng)));
            uint256 ai = round % 2; // 0: A attacks, 1: B attacks
            uint256 di = 1 - ai;
            uint256 d = _strike(atk[ai], def[di], mlt[ai], sk[ai], sk[di], rng);
            hp[di] = d >= hp[di] ? 0 : hp[di] - d;
            if (hp[di] == 0) return ai == 0; // A wins iff B's HP hit 0
        }
        // затянулось → сравнить долю оставшегося HP (кросс-умножение, без деления)
        uint256 lh = hp[0] * startHp[1];
        uint256 rh = hp[1] * startHp[0];
        if (lh != rh) return lh > rh;
        return (rng & 1) == 0; // полный тай-брейк
    }

    /// @dev atk * (10000 ± varBps)/10000. Возвращает новый rng.
    function _roll(uint256 atk, uint256 varBps, uint256 rng) internal pure returns (uint256 scaled, uint256 newRng) {
        newRng = uint256(keccak256(abi.encodePacked(rng)));
        uint256 delta = newRng % (2 * varBps + 1);      // 0..2*var
        uint256 factor = 10000 + delta - varBps;        // 10000-var .. 10000+var (var<=5000 → factor>=5000)
        scaled = (atk * factor) / 10000;
    }

    /// @dev Множители стихий: преимущество +adv, недостаток -adv, равенство 1.0.
    function _elementMult(uint8 elA, uint8 elB) internal view returns (uint256 mltA, uint256 mltB) {
        uint256 adv = config.typeAdvBps();
        if (_beats(elA, elB)) return (10000 + adv, 10000 - adv);
        if (_beats(elB, elA)) return (10000 - adv, 10000 + adv);
        return (10000, 10000);
    }

    /// @dev Кто кого бьёт: цикл 0->1->2->3->0.
    function _beats(uint8 x, uint8 y) internal pure returns (bool) {
        return y == uint8((uint256(x) + 1) % ELEMENT_COUNT);
    }

    /// @dev Один удар. atkSkill — скилл атакующего, defSkill — скилл защитника.
    function _strike(
        uint256 atk,
        uint256 def,
        uint256 multBps,
        uint8 atkSkill,
        uint8 defSkill,
        uint256 rng
    ) internal pure returns (uint256) {
        uint256 effAtk = (atk * multBps) / 10000;
        if (atkSkill == SKILL_PIERCE) def = 0;
        uint256 base = effAtk > def / 2 ? effAtk - def / 2 : 1;
        if (atkSkill == SKILL_PRECISION) base = (base * 115) / 100;
        if (atkSkill == SKILL_CRIT && rng % 5 == 0) base = base * 2;
        if (defSkill == SKILL_SHIELD) base = (base * 70) / 100;
        return base == 0 ? 1 : base;
    }

    function _loseLife(uint256 card, address owner, bool fromVault) internal {
        uint256 l = lives(card);
        l -= 1;
        if (l == 0) {
            _kill(card, owner, fromVault);
        } else {
            livesOf[card] = l;
            _release(card, owner, fromVault);
        }
    }
}
