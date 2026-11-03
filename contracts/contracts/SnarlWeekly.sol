// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IIdentityV2} from "./IIdentityV2.sol";
import {Planarity} from "./Planarity.sol";

/**
 * The Great Untangle's prize pool.
 *
 * One knot a week. Everybody gets the same tangle; anyone who frees it and is a verified
 * unique person enters, and when the week closes the pool is split equally between the
 * people who entered. Equal shares, not shares by effort: the hundredth pass earns what
 * the first did, so there is nothing to farm, and the game stays a game.
 *
 * Entering means handing the contract a drawing of the week's knot with no crossing
 * strings, which it checks itself. That proves the knot is untangled. It does not prove
 * the sender untangled it by hand — the creature's true shape is open source, as it should
 * be — and the contract does not pretend otherwise. What makes that acceptable is the cap:
 * one entry per identity, so solving it with a script earns exactly what solving it with a
 * thumb earns, and no more.
 *
 * The pool is G$ and nothing else. The contract never mints, never prices anything, and
 * holds only what somebody deliberately put in it.
 */
contract SnarlWeekly is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Planarity for bytes;

    struct Knot {
        /** Entries close here; collection opens here. */
        uint64 closesAt;
        /** After this, whatever is left can be swept into another week. */
        uint64 sweepableAt;
        /** G$ put up for this week. */
        uint128 pool;
        uint32 beads;
        uint32 entrants;
        /** pool / entrants, frozen when the week is settled. */
        uint128 share;
        bool settled;
        /** Two bytes per string: the beads it joins. */
        bytes edges;
    }

    IERC20 public immutable token;
    IIdentityV2 public immutable identity;

    mapping(uint32 week => Knot) private _knots;
    /** Keyed by identity root, so linked wallets count as one person. */
    mapping(uint32 week => mapping(address root => bool)) public entered;
    mapping(uint32 week => mapping(address root => bool)) public collected;

    /** How many of a week's entrants have taken their share. */
    mapping(uint32 week => uint32 count) public collectedCount;

    /** G$ spoken for by open weeks, so the owner cannot withdraw it. */
    uint256 public locked;

    event KnotOpened(uint32 indexed week, uint256 pool, uint64 closesAt);
    event KnotFunded(uint32 indexed week, address indexed from, uint256 amount);
    event Entered(uint32 indexed week, address indexed root, address indexed by);
    event Settled(uint32 indexed week, uint32 entrants, uint256 share);
    event Collected(uint32 indexed week, address indexed root, address to, uint256 amount);
    event Swept(uint32 indexed from, uint32 indexed into, uint256 amount);

    error UnknownKnot();
    error KnotExists();
    error KnotClosed();
    error KnotOpen();
    error NotSettled();
    error AlreadySettled();
    error NotVerified();
    error AlreadyEntered();
    error NothingToCollect();
    error StillTangled(uint256 crossings);
    error BadWindow();
    error NotSweepableYet();
    error NothingSpare();

    constructor(IERC20 g$, IIdentityV2 identityContract, address owner) Ownable(owner) {
        token = g$;
        identity = identityContract;
    }

    function knot(uint32 week) external view returns (Knot memory) {
        return _knots[week];
    }

    /**
     * Opens a week with its knot and whatever the pool starts at. The pool may be zero:
     * a week with no money is still a week, and the creature inside it is the real prize.
     */
    function openKnot(
        uint32 week,
        bytes calldata edges,
        uint32 beads,
        uint64 closesAt,
        uint64 sweepableAt,
        uint256 amount
    ) external onlyOwner {
        if (_knots[week].closesAt != 0) revert KnotExists();
        if (closesAt <= block.timestamp || sweepableAt < closesAt) revert BadWindow();
        if (edges.length == 0 || edges.length % 2 != 0) revert Planarity.BadEdgeList();
        if (beads == 0 || beads > 256) revert Planarity.BadPositions();

        _knots[week] = Knot({
            closesAt: closesAt,
            sweepableAt: sweepableAt,
            pool: 0,
            beads: beads,
            entrants: 0,
            share: 0,
            settled: false,
            edges: edges
        });

        emit KnotOpened(week, amount, closesAt);
        if (amount > 0) _fund(week, amount);
    }

    /** Anyone can add to a week's pool. A sponsor is just an address that cares. */
    function fund(uint32 week, uint256 amount) external {
        if (_knots[week].closesAt == 0) revert UnknownKnot();
        if (block.timestamp >= _knots[week].closesAt) revert KnotClosed();
        _fund(week, amount);
    }

    function _fund(uint32 week, uint256 amount) private {
        token.safeTransferFrom(msg.sender, address(this), amount);
        _knots[week].pool += uint128(amount);
        locked += amount;
        emit KnotFunded(week, msg.sender, amount);
    }

    /**
     * Enter the week by showing the knot untangled.
     *
     * `xs` and `ys` are the beads' positions, in the same order as the creature's own
     * bead list. The contract checks that no two strings cross; anything else about the
     * drawing is the player's business.
     */
    function enter(
        uint32 week,
        int256[] calldata xs,
        int256[] calldata ys
    ) external whenNotPaused nonReentrant {
        Knot storage k = _knots[week];
        if (k.closesAt == 0) revert UnknownKnot();
        if (block.timestamp >= k.closesAt) revert KnotClosed();
        if (xs.length != k.beads || ys.length != k.beads) revert Planarity.BadPositions();

        address root = _rootOf(msg.sender);
        if (entered[week][root]) revert AlreadyEntered();

        uint256 found = Planarity.crossings(k.edges, xs, ys);
        if (found != 0) revert StillTangled(found);

        entered[week][root] = true;
        unchecked {
            k.entrants += 1;
        }
        emit Entered(week, root, msg.sender);
    }

    /**
     * Freezes the share once the week is over. Anyone may call it: the sooner it happens
     * the sooner people are paid, and it takes no side.
     */
    function settle(uint32 week) public {
        Knot storage k = _knots[week];
        if (k.closesAt == 0) revert UnknownKnot();
        if (block.timestamp < k.closesAt) revert KnotOpen();
        if (k.settled) revert AlreadySettled();

        k.settled = true;
        k.share = k.entrants == 0 ? 0 : uint128(uint256(k.pool) / k.entrants);
        emit Settled(week, k.entrants, k.share);
    }

    /** Takes this person's share of a settled week. */
    function collect(uint32 week) external nonReentrant {
        Knot storage k = _knots[week];
        if (k.closesAt == 0) revert UnknownKnot();
        if (!k.settled) revert NotSettled();

        address root = _rootOf(msg.sender);
        if (!entered[week][root] || collected[week][root]) revert NothingToCollect();

        uint256 amount = k.share;
        if (amount == 0) revert NothingToCollect();

        collected[week][root] = true;
        unchecked {
            collectedCount[week] += 1;
        }
        locked -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Collected(week, root, msg.sender, amount);
    }

    /**
     * What nobody came for rolls into another week rather than back to whoever funded it.
     * Only reachable once the collection window has passed.
     */
    function sweep(uint32 from, uint32 into) external onlyOwner {
        Knot storage old = _knots[from];
        if (old.closesAt == 0 || _knots[into].closesAt == 0) revert UnknownKnot();
        if (!old.settled) revert NotSettled();
        if (block.timestamp < old.sweepableAt) revert NotSweepableYet();

        uint256 paid = uint256(old.share) * collectedCount[from];
        uint256 spare = uint256(old.pool) - paid;
        if (spare == 0) revert NothingSpare();

        old.pool = uint128(paid);
        // Nothing is owed by this week any more. Anyone who entered and never came back
        // had until `sweepableAt`, and the share they did not take is now next week's.
        old.share = 0;
        _knots[into].pool += uint128(spare);
        emit Swept(from, into, spare);
    }

    /**
     * G$ that arrived by accident — sent straight to the contract rather than through
     * `fund` — can be recovered. Anything a week is holding cannot.
     */
    function rescue(address to, uint256 amount) external onlyOwner {
        uint256 spare = token.balanceOf(address(this)) - locked;
        if (amount > spare) revert NothingSpare();
        token.safeTransfer(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * One human, one entry. GoodDollar lets a person link several wallets to one identity
     * root, so that root is what counts; an unverified address has no root and cannot
     * enter at all.
     */
    function _rootOf(address account) private view returns (address root) {
        root = identity.getWhitelistedRoot(account);
        if (root == address(0)) revert NotVerified();
    }

}
