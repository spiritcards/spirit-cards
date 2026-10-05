// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Config} from "./Config.sol";
import {ChipToken} from "./ChipToken.sol";
import {Points} from "./Points.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";

/// @title SpiritCards — Spirit Cards (SPC) core.
/// @notice PoW-минтинг с ФИКС-сложностью (без храповика), MERGE 2->1 (дефляция),
///         тюнябельные параметры через Config, глобальный эмиссионный гейт, спин-фишки (ERC-1155),
///         роялти ERC-2981 -> treasury. Пост-инклюжн сид печатается сразу (single-tx).
///         Stake/Battle/Packs/Points + marketplace-метаданные (ERC-173 owner, EIP-7572
///         contractURI, ERC-4906 MetadataUpdate — для OpenSea).

interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function supportsInterface(bytes4 interfaceId) external pure returns (bool);
}

/// @dev Revenue sink: the StakeVault receives staker dividends via notifyRewards().
interface IStakeVault {
    function notifyRewards() external payable;
}

/// @dev Минимальный ERC-721 (без внешних зависимостей) + ERC-2981 royalty. Каноничный флоу — отдельный гейт.
contract SpiritCards is IERC721, ReentrancyGuard {
    string public name = "Spirit Cards";
    string public symbol = "SPC";
    string public baseURI;
    string private _contractURI; // EIP-7572: collection-level metadata (data: URI) for marketplaces

    Config public immutable config;
    ChipToken public immutable chip;
    Points public points; // setlater (points/leaderboard); null-safe in hooks
    address public vault; // setlater (StakeVault); destination of pumpPool()
    address public masterRef; // fixed upline for EVERY payer; earns masterRefBps of gross

    mapping(uint256 => address) internal _ownerOf;
    mapping(address => uint256) internal _balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    // --- mining state ---
    mapping(address => mapping(uint256 => bool)) public nonceUsed; // miner => nonce => used
    mapping(address => uint256) public lastMintAt;
    uint256 public epochStart;
    uint256 public epochMinted;
    uint256 public totalMinted;   // base supply: mine + pack (forged cards are a SEPARATE namespace; see `forged`)
    uint256 public paidMinted;    // для ценовой шкалы
    uint256 public burned;
    uint256 public forged;
    uint256 private forgeCounter;

    // --- seeds (ПЕЧАТАЕМ РЕАЛЬНУЮ РЕДКОСТЬ СРАЗУ, single-tx; precompute принят владельцем) ---
    mapping(uint256 => bytes32) public seedOf;       // реальный сид карты (сразу)

    // --- referral (платим % от ВСЕХ действий реферала, не от депозита) ---
    mapping(address => address) public referrerOf;
    mapping(address => uint256) public referralEarned; // сколько может забрать реферер
    uint256 public accruedReferral;                    // фонд рефералов (отдельный кошелёк)
    uint256 public referralOutstanding;                // сумма невыплаченных referralEarned (защита от свипа)

    // --- revenue buckets ---
    uint256 public accruedPool;
    uint256 public accruedHouse;
    uint256 public accruedReserve;

    event Mined(address indexed miner, uint256 indexed tokenId, uint256 nonce, bytes32 work, uint256 bits, uint256 paid);
    event Merged(uint256 indexed a, uint256 indexed b, uint256 indexed child, uint256 fee);
    event Split(uint256 pool, uint256 referral, uint256 house, uint256 reserve);
    event ReferrerSet(address indexed user, address indexed referrer);
    event ReferralClaimed(address indexed referrer, uint256 amount);

    modifier onlyConfigOwner() {
        require(msg.sender == config.owner(), "NOT_OWNER");
        _;
    }

    constructor(Config _config, ChipToken _chip, string memory _baseURI) {
        config = _config;
        chip = _chip;
        baseURI = _baseURI;
        epochStart = block.timestamp;
    }

    // ------------------------------------------------------------------
    // Marketplace metadata (OpenSea): ERC-173 owner + EIP-7572 contractURI + ERC-4906
    // ------------------------------------------------------------------

    event ContractURIUpdated();
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    /// @notice ERC-173 ownership for marketplaces (OpenSea contract attribution).
    ///         Always mirrors Config.owner() (deployer at start; Safe after handover).
    function owner() external view returns (address) {
        return config.owner();
    }

    /// @notice Collection-level metadata (OpenSea reads contractURI(); EIP-7572).
    ///         Usually a data:application/json;base64,... URI — все зашито в контракт.
    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    /// @notice Set the collection metadata URI (owner). Emits ContractURIUpdated for indexers.
    function setContractURI(string calldata uri) external onlyConfigOwner {
        _contractURI = uri;
        emit ContractURIUpdated();
    }

    /// @notice Change the item-metadata base URI (owner). Emits ERC-4906 so marketplaces
    ///         (OpenSea) re-read item metadata after the change.
    function setBaseURI(string calldata uri) external onlyConfigOwner {
        baseURI = uri;
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    // ------------------------------------------------------------------
    // PoW
    // ------------------------------------------------------------------
    /// @notice Требуемая сложность сейчас: baseBits + дробный шаг за каждую ценовую эру
    ///         (bitsStepX100 сотых бита за эру; on-chain проверяется по целому числу бит).
    function requiredBits() public view returns (uint256) {
        uint256 size = config.eraSize();
        uint256 era = size == 0 ? 0 : paidMinted / size;
        return config.baseBits() + (era * config.bitsStepX100()) / 100;
    }

    /// @notice work = keccak256(chainId || contract || miner || nonce)
    function workFor(address miner, uint256 nonce) public view returns (bytes32) {
        return keccak256(abi.encodePacked(block.chainid, address(this), miner, nonce));
    }

    function leadingZeroBits(bytes32 w) public pure returns (uint256) {
        uint256 x = uint256(w);
        if (x == 0) return 256;
        uint256 count = 0;
        uint256 mask = 1 << 255;
        while ((x & mask) == 0) {
            count += 1;
            mask >>= 1;
        }
        return count;
    }

    function currentPrice() public view returns (uint256) {
        uint256 era = paidMinted / config.eraSize();
        uint256 p = config.eraPrice();
        uint256 step = config.priceStepBps();
        uint256 cap = era < 64 ? era : 64;
        for (uint256 i = 0; i < cap; i++) {
            p = (p * (10000 + step)) / 10000;
        }
        return p;
    }

    function _rollEpoch() internal {
        if (block.timestamp >= epochStart + config.epochLength()) {
            epochStart = block.timestamp;
            epochMinted = 0;
        }
    }

    /// @notice Добыть карту. nonce честно майнится офчейн; контракт проверяет PoW.
    /// @param useChip потратить 1 фишку на скидку -chipDiscountBps.
    function mine(uint256 nonce, bool useChip) external payable nonReentrant {
        require(!config.paused(), "PAUSED");
        require(totalMinted + 1 <= config.maxSupply(), "SOLD_OUT");
        _rollEpoch();
        require(epochMinted < config.epochCap(), "EPOCH_FULL");
        require(block.timestamp >= lastMintAt[msg.sender] + config.mineCooldown(), "COOLDOWN");

        bytes32 w = workFor(msg.sender, nonce);
        require(leadingZeroBits(w) >= requiredBits(), "BAD_POW");
        require(!nonceUsed[msg.sender][nonce], "NONCE_USED");

        uint256 price = currentPrice();
        uint256 due = price;
        if (useChip) {
            require(chip.balanceOf(msg.sender, chip.CHIP()) > 0, "NO_CHIP");
            chip.burn(msg.sender, chip.CHIP(), 1);
            due = price - (price * config.chipDiscountBps()) / 10000;
        }
        require(msg.value == due, "BAD_PAY");

        nonceUsed[msg.sender][nonce] = true;
        lastMintAt[msg.sender] = block.timestamp;
        epochMinted += 1;
        totalMinted += 1;
        paidMinted += 1;
        // A FULL-price mint grants a chip (accelerator for the NEXT mint); a
        // chip-discounted mint only CONSUMES one — otherwise the chip would be
        // re-granted forever and the -30% discount would never expire.
        if (!useChip) chip.mint(msg.sender, chip.CHIP(), 1);

        uint256 id = totalMinted;
        _mint(msg.sender, id);
        // реальная редкость печатается сразу (OpenSea-консистентность; precompute принят владельцем)
        seedOf[id] = keccak256(abi.encodePacked(block.prevrandao, msg.sender, nonce, id));

        if (address(points) != address(0)) points.addPoints(msg.sender, config.pointsMine(), "MINE");

        emit Mined(msg.sender, id, nonce, w, requiredBits(), due);
        _split(due, msg.sender);
    }

    /// @notice MERGE: сжечь 2 карты -> 1 ребёнок (эволюция; Level/статы — офчейн из сида).
    function mergeBurn(uint256 a, uint256 b) external payable nonReentrant {
        require(!config.paused(), "PAUSED");
        require(a != b, "SAME");
        require(_ownerOf[a] == msg.sender && _ownerOf[b] == msg.sender, "NOT_OWNER");
        require(msg.value == config.mergeFee(), "BAD_FEE");

        bytes32 s = keccak256(abi.encodePacked(seedOf[a], seedOf[b], block.prevrandao, msg.sender));
        _burn(a);
        _burn(b);
        burned += 2;

        // Anti-arbitrage: a small chance the merge "fails" — both cards burn with
        // no upgrade (closes the "N+1 always > 2xN" arbitrage). mergeFailBps=0 disables.
        uint256 roll = uint256(keccak256(abi.encodePacked(s, "DUD"))) % 10_000;
        if (roll < config.mergeFailBps()) {
            emit Merged(a, b, 0, msg.value); // child id 0 = dud (no card minted)
            _split(msg.value, msg.sender);
            return;
        }

        forgeCounter += 1;
        uint256 id = 10_000_000 + forgeCounter;
        _mint(msg.sender, id);
        seedOf[id] = s;
        forged += 1;

        if (address(points) != address(0)) points.addPoints(msg.sender, config.pointsMerge(), "MERGE");

        emit Merged(a, b, id, msg.value);
        _split(msg.value, msg.sender);
    }

    // ------------------------------------------------------------------
    // Referral: % от ВСЕХ действий реферала (mine/merge/stake/pvp...) — не от депозита
    // ------------------------------------------------------------------
    function setReferrer(address ref) external {
        require(referrerOf[msg.sender] == address(0), "SET");
        require(ref != msg.sender, "SELF");
        require(ref != address(0), "ZERO");
        require(_balanceOf[ref] > 0, "REF_NO_MINT"); // реферер сам минтил
        referrerOf[msg.sender] = ref;
        emit ReferrerSet(msg.sender, ref);
    }

    function claimReferral() external nonReentrant {
        uint256 v = referralEarned[msg.sender];
        require(v > 0, "NOTHING");
        referralEarned[msg.sender] = 0;
        referralOutstanding -= v;
        accruedReferral -= v;
        (bool ok,) = msg.sender.call{value: v}("");
        require(ok, "XFER");
        emit ReferralClaimed(msg.sender, v);
    }

    /// @notice Остаток реферального фонда (владелец): только НЕраспределённый излишек.
    ///         Начисленное реферерам (referralOutstanding) остаётся в контракте и защищено.
    function withdrawReferralLeftover(address to) external onlyConfigOwner nonReentrant {
        uint256 owed = referralOutstanding;
        uint256 v = accruedReferral - owed; // свипаем только излишек без получателя
        require(v > 0, "NOTHING");
        accruedReferral = owed;
        (bool ok,) = to.call{value: v}("");
        require(ok, "XFER");
    }

    // ------------------------------------------------------------------
    // Revenue split: pool 60 / referral 10 / treasury 30 / reserve 0
    // ------------------------------------------------------------------
    function _split(uint256 amount, address payer) internal {
        if (amount == 0) return;
        uint256 toReferral = (amount * config.referralBps()) / 10000; // весь реф-фонд (10%)
        uint256 toPool = (amount * config.poolBps()) / 10000;
        uint256 toHouse = (amount * config.houseBps()) / 10000;
        uint256 toReserve = amount - toReferral - toPool - toHouse; // остаток
        accruedPool += toPool;
        accruedHouse += toHouse;
        accruedReserve += toReserve;
        if (toReferral > 0) {
            accruedReferral += toReferral;
            // (1) фикс. вырез команде (master ref): 3% от gross, с ЛЮБОГО плательщика.
            //     Если masterRef не задан — выреза нет, реферер получает все 10%.
            uint256 toMaster = masterRef == address(0) ? 0 : (amount * config.masterRefBps()) / 10000;
            if (toMaster > toReferral) toMaster = toReferral;
            if (toMaster > 0) {
                referralEarned[masterRef] += toMaster;
                referralOutstanding += toMaster;
            }
            // (2) остаток (7%) — рефереру плательщика; если реферера нет, остаётся в pooled
            //     (accruedReferral минус referralOutstanding) на финальный свип.
            uint256 toReferrer = toReferral - toMaster;
            address ref = referrerOf[payer];
            if (ref != address(0) && toReferrer > 0) {
                referralEarned[ref] += toReferrer;
                referralOutstanding += toReferrer;
            }
        }
        emit Split(toPool, toReferral, toHouse, toReserve);
    }

    function withdrawHouse(address to) external onlyConfigOwner nonReentrant {
        uint256 v = accruedHouse;
        accruedHouse = 0;
        (bool ok,) = to.call{value: v}("");
        require(ok, "XFER");
    }

    function withdrawReserve(address to) external onlyConfigOwner nonReentrant {
        uint256 v = accruedReserve;
        accruedReserve = 0;
        (bool ok,) = to.call{value: v}("");
        require(ok, "XFER");
    }

    /// @notice Вывести накопленный пул (дивиденды стейкеров). Кипер переливает его в
    ///         StakeVault.notifyRewards() (см. script/PumpPool.s.sol). Реентрант защищён.
    function withdrawPool(address to) external onlyConfigOwner nonReentrant {
        uint256 v = accruedPool;
        require(v > 0, "NOTHING");
        accruedPool = 0;
        (bool ok,) = to.call{value: v}("");
        require(ok, "XFER");
    }

    event PoolPumped(address indexed vault, uint256 amount);

    /// @notice Permissionless keeper: push the accrued pool into the staking vault
    ///         as dividends. Safe for anyone (cron / UI / user) to call — the funds
    ///         always go to the vault, never to the caller.
    function pumpPool() external nonReentrant {
        uint256 v = accruedPool;
        require(v > 0, "NOTHING");
        require(vault != address(0), "NO_VAULT");
        accruedPool = 0;
        IStakeVault(vault).notifyRewards{value: v}();
        emit PoolPumped(vault, v);
    }

    /// @notice Set the StakeVault that receives dividends (owner).
    function setVault(address _vault) external onlyConfigOwner {
        require(_vault != address(0), "ZERO");
        vault = _vault;
    }

    /// @notice Fixed master-referral upline for every payer (owner). Earns masterRefBps of gross.
    function setMasterRef(address _masterRef) external onlyConfigOwner {
        masterRef = _masterRef;
    }

    /// @notice Внешняя выручка в пул (рейк боя, спонсоры). Пополняет дивиденды стейкеров.
    function addToPool() external payable nonReentrant {
        accruedPool += msg.value;
    }

    /// @notice Установить контракт очков (лидерборд).
    function setPointsContract(address _points) external onlyConfigOwner {
        points = Points(_points);
    }

    // ------------------------------------------------------------------
    // Packs — минт пачки карт (PoW/epoch bypass) + сбор выручки через сплит
    // ------------------------------------------------------------------
    address public packMinter;

    event PackMinted(address indexed to, uint256 firstId, uint256 count);

    function setPackMinter(address m) external onlyConfigOwner {
        packMinter = m;
    }

    /// @notice Минт `count` карт получателю (вызывает контракт Packs). Обходит PoW/эпоху/cooldown.
    function mintPack(address to, uint256 count) external nonReentrant returns (uint256 firstId) {
        require(msg.sender == packMinter, "NOT_PACK_MINTER");
        require(to != address(0) && count > 0, "ARGS");
        require(totalMinted + count <= config.maxSupply(), "SOLD_OUT");
        firstId = totalMinted + 1;
        for (uint256 i = 0; i < count; i++) {
            uint256 id = totalMinted + 1;
            totalMinted += 1;
            paidMinted += 1;
            _mint(to, id);
            seedOf[id] = keccak256(abi.encodePacked(block.prevrandao, to, id, i));
        }
        emit PackMinted(to, firstId, count);
    }

    /// @notice Приём выручки (Packs пересылает ETH покупателя) с тем же сплитом pool/ref/house.
    function collectRevenue(address payer) external payable nonReentrant {
        _split(msg.value, payer);
    }

    // ------------------------------------------------------------------
    // ERC-2981 royalty (вторичка -> treasury)
    // ------------------------------------------------------------------
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        receiver = config.treasury();
        royaltyAmount = (salePrice * config.royaltyBps()) / 10000;
    }

    // ------------------------------------------------------------------
    // ERC-721 (minimal)
    // ------------------------------------------------------------------
    function ownerOf(uint256 id) public view returns (address o) {
        o = _ownerOf[id];
        require(o != address(0), "NOT_MINTED");
    }

    function balanceOf(address o) public view returns (uint256) {
        return _balanceOf[o];
    }

    function approve(address sp, uint256 id) external {
        address o = _ownerOf[id];
        require(msg.sender == o || isApprovedForAll[o][msg.sender], "NOT_AUTH");
        getApproved[id] = sp;
        emit Approval(o, sp, id);
    }

    function setApprovalForAll(address op, bool b) external {
        isApprovedForAll[msg.sender][op] = b;
        emit ApprovalForAll(msg.sender, op, b);
    }

    function transferFrom(address from, address to, uint256 id) public {
        require(from == _ownerOf[id], "WRONG_FROM");
        require(to != address(0), "INVALID_RECIPIENT");
        require(
            msg.sender == from || isApprovedForAll[from][msg.sender] || msg.sender == getApproved[id],
            "NOT_AUTH"
        );
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        _ownerOf[id] = to;
        delete getApproved[id];
        emit Transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        transferFrom(from, to, id);
    }

    /// @notice Сжечь карту (для будущего Battle: жизни кончились) — только владелец карты.
    function burnCard(uint256 id) external {
        require(_ownerOf[id] == msg.sender, "NOT_OWNER");
        _burn(id);
        burned += 1;
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        require(_ownerOf[id] != address(0), "NOT_MINTED");
        return string(abi.encodePacked(baseURI, _toString(id)));
    }

    function supportsInterface(bytes4 iid) external pure returns (bool) {
        return iid == 0x01ffc9a7 || iid == 0x80ac58cd || iid == 0x5b5e139f || iid == 0x2a55205a;
    }

    function _mint(address to, uint256 id) internal {
        require(to != address(0), "MINT_ZERO");
        require(_ownerOf[id] == address(0), "EXISTS");
        _balanceOf[to] += 1;
        _ownerOf[id] = to;
        emit Transfer(address(0), to, id);
    }

    function _burn(uint256 id) internal {
        address o = _ownerOf[id];
        require(o != address(0), "NOT_MINTED");
        _balanceOf[o] -= 1;
        delete _ownerOf[id];
        delete getApproved[id];
        emit Transfer(o, address(0), id);
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v;
        uint256 d;
        while (t != 0) {
            d++;
            t /= 10;
        }
        bytes memory b = new bytes(d);
        while (v != 0) {
            d--;
            b[d] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(b);
    }

    receive() external payable {}
}
