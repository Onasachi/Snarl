// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Player-reported gameplay records and fixed-price G$ supplies.
/// The frontend checks solutions. These records are NOT server-verified gameplay,
/// identity attestations, or a basis for paying rewards. Any wallet can participate.
contract SnarlGame is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Run {
        bytes32 id;
        uint32 level; // 0 for tutorial/daily/weekly/trail puzzles.
        uint16 crossings;
        uint32 moves;
        uint16 par;
        bool assisted;
        bytes32 solutionHash;
    }
    struct Player {
        uint32 runs;
        uint64 crossings;
        uint64 points;
    }
    IERC20 public immutable token;
    address public immutable treasury;
    mapping(address => mapping(bytes32 => bool)) public recorded;
    mapping(address => Player) public players;
    address[] private _players;
    mapping(address => mapping(uint8 => uint256)) public purchasedUnits;
    mapping(address => bool) public hasPurchased;
    uint256 public runCount;
    uint256 public sales;
    uint256 public buyers;
    uint256 public volume;

    error Invalid();
    error AlreadyRecorded();
    error UnsupportedToken();
    event RunRecorded(address indexed player, bytes32 indexed runId, uint32 indexed level, uint16 crossings, uint32 moves, uint16 par, bool assisted, uint256 points, bytes32 solutionHash);
    event SuppliesPurchased(address indexed buyer, uint8 indexed item, uint256 units, uint256 paid);

    constructor(IERC20 token_, address treasury_) {
        if (address(token_).code.length == 0 || treasury_ == address(0)) revert Invalid();
        token = token_;
        treasury = treasury_;
    }

    function recordRun(Run calldata run) external {
        if (run.id == bytes32(0) || run.solutionHash == bytes32(0) || run.crossings == 0 || run.crossings > 512 || run.par == 0 || run.par > 512 || run.moves > 100000) revert Invalid();
        if (recorded[msg.sender][run.id]) revert AlreadyRecorded();
        recorded[msg.sender][run.id] = true;
        Player storage player = players[msg.sender];
        if (player.runs == 0) _players.push(msg.sender);
        uint256 points = uint256(run.crossings) * 10 + (!run.assisted && run.moves <= run.par ? 25 : 0);
        player.runs += 1;
        player.crossings += run.crossings;
        player.points += uint64(points);
        runCount += 1;
        emit RunRecorded(msg.sender, run.id, run.level, run.crossings, run.moves, run.par, run.assisted, points, run.solutionHash);
    }

    /// Prices are G$ on Celo (18 decimals). One bundle per purchase.
    function offer(uint8 item) public pure returns (uint256 price, uint256 units) {
        if (item == 0) return (100 ether, 5); // Hints.
        if (item == 1) return (150 ether, 3); // Helping hand.
        if (item == 2) return (75 ether, 3);  // Firefly vision.
        revert Invalid();
    }

    function buy(uint8 item) external nonReentrant {
        if (msg.sender == treasury) revert Invalid();
        (uint256 price, uint256 units) = offer(item);
        uint256 beforeBalance = token.balanceOf(treasury);
        token.safeTransferFrom(msg.sender, treasury, price);
        if (token.balanceOf(treasury) - beforeBalance != price) revert UnsupportedToken();
        purchasedUnits[msg.sender][item] += units;
        if (!hasPurchased[msg.sender]) { hasPurchased[msg.sender] = true; buyers += 1; }
        sales += 1;
        volume += price;
        emit SuppliesPurchased(msg.sender, item, units, price);
    }

    function playerCount() external view returns (uint256) { return _players.length; }

    function page(uint256 offset, uint256 limit) external view returns (address[] memory wallets, Player[] memory records) {
        uint256 count = offset >= _players.length ? 0 : _players.length - offset;
        if (count > limit) count = limit;
        if (count > 100) count = 100;
        wallets = new address[](count);
        records = new Player[](count);
        for (uint256 i; i < count; ++i) {
            wallets[i] = _players[offset + i];
            records[i] = players[wallets[i]];
        }
    }
}
