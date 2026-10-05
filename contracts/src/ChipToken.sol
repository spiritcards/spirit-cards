// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ChipToken — минимальный ERC-1155 для «фишек» Spirit Cards (прокрут-ускоритель).
/// @notice Фишка — расходник: платный минт выдаёт 1 фишку (id 0), следующая добыча с фишкой -30%.
///         Минтить/сжигать может только назначенный minter (SpiritCards). Owner = Config.owner (Safe).
contract ChipToken {
    uint256 public constant CHIP = 0; // единственный пока id

    string public name = "Spirit Cards Chips";
    string public symbol = "CHIP";

    address public owner;
    address public minter;

    mapping(uint256 => mapping(address => uint256)) private _bal;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    event TransferSingle(address indexed op, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed op, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event MinterSet(address indexed minter);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "NOT_MINTER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
        emit MinterSet(_minter);
    }

    function transferOwnership(address to) external onlyOwner {
        require(to != address(0), "ZERO");
        owner = to;
    }

    // --- ERC-1155 views ---
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "ZERO");
        return _bal[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory out) {
        require(accounts.length == ids.length, "LEN");
        out = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            out[i] = _bal[ids[i]][accounts[i]];
        }
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata) external {
        require(from == msg.sender || isApprovedForAll[from][msg.sender], "NOT_AUTH");
        require(to != address(0), "ZERO");
        _bal[id][from] -= value;
        _bal[id][to] += value;
        emit TransferSingle(msg.sender, from, to, id, value);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata) external {
        require(from == msg.sender || isApprovedForAll[from][msg.sender], "NOT_AUTH");
        require(to != address(0), "ZERO");
        require(ids.length == values.length, "LEN");
        for (uint256 i = 0; i < ids.length; i++) {
            _bal[ids[i]][from] -= values[i];
            _bal[ids[i]][to] += values[i];
        }
        emit TransferBatch(msg.sender, from, to, ids, values);
    }

    function supportsInterface(bytes4 iid) external pure returns (bool) {
        return iid == 0x01ffc9a7 || iid == 0xd9b67a26; // ERC165, ERC1155
    }

    // --- mint/burn (only minter) ---
    function mint(address to, uint256 id, uint256 amount) external onlyMinter {
        require(to != address(0), "ZERO");
        _bal[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function burn(address from, uint256 id, uint256 amount) external onlyMinter {
        require(_bal[id][from] >= amount, "INSUFFICIENT");
        _bal[id][from] -= amount;
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }
}
