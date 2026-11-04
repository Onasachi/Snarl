// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IIdentityV2} from "./IIdentityV2.sol";
import {Planarity} from "./Planarity.sol";

/**
 * How many knots a person has freed, and which creatures they have freed at least once.
 *
 * A proof is a drawing of one of the roster's creatures with no crossing strings, checked
 * here the same way the weekly pool checks its own. The roster lives in this contract, so
 * the shape being proved is the shape the game actually ships: a player supplies only the
 * positions, never the strings, and cannot invent a two-bead creature to farm.
 *
 * Counted per GoodDollar identity root, like everything else here, so one person is one
 * row however many wallets they bring.
 *
 * What this measures, said plainly: `untangles` counts proofs, and a proof costs a
 * transaction. Every creature's true shape is in snarl's repository, as it should be, so
 * a script can produce proofs as fast as it can pay for them. A ranking by `untangles` is
 * therefore a ranking of what people were willing to spend, and nobody should be told
 * otherwise. `distinct` is the honest column: the roster is finite, each creature counts
 * once, and a full set is a full set whoever drew it.
 */
contract SnarlBoard is Ownable {
    using Planarity for bytes;

    struct Creature {
        uint32 beads;
        /** Two bytes per string: the beads it joins. Empty means there is no such creature. */
        bytes edges;
    }

    struct Record {
        /** Proofs filed. Goes up forever; see the note above about what that means. */
        uint32 untangles;
        /** How many different creatures this person has freed at least once. */
        uint32 distinct;
        uint64 lastAt;
        /** One bit per creature id. */
        uint256 freed;
    }

    IIdentityV2 public immutable identity;

    mapping(uint8 id => Creature) private _roster;
    uint8 public rosterSize;

    mapping(address root => Record) public records;
    /** Everyone who has ever filed a proof, in the order they first did. */
    address[] private _players;

    event CreatureAdded(uint8 indexed id, uint32 beads, bytes edges);
    event Untangled(address indexed root, uint8 indexed creature, uint32 untangles, bool first);

    error NotVerified();
    error NoSuchCreature();
    error CreatureExists();
    error StillTangled(uint256 crossings);

    constructor(IIdentityV2 identityContract, address owner) Ownable(owner) {
        identity = identityContract;
    }

    /**
     * Adds a creature to the roster. It can never be changed or removed afterwards: a
     * board whose past can be rewritten is not a record of anything.
     */
    function addCreature(uint8 id, bytes calldata edges, uint32 beads) external onlyOwner {
        if (_roster[id].edges.length != 0) revert CreatureExists();
        if (edges.length == 0 || edges.length % 2 != 0) revert Planarity.BadEdgeList();
        if (beads == 0 || beads > 256) revert Planarity.BadPositions();

        _roster[id] = Creature({beads: beads, edges: edges});
        if (id >= rosterSize) rosterSize = id + 1;
        emit CreatureAdded(id, beads, edges);
    }

    function creature(uint8 id) external view returns (Creature memory) {
        return _roster[id];
    }

    /** Files one untangled drawing. The creature decides the strings; the player the places. */
    function prove(uint8 id, int256[] calldata xs, int256[] calldata ys) external {
        Creature storage shape = _roster[id];
        if (shape.edges.length == 0) revert NoSuchCreature();
        if (xs.length != shape.beads || ys.length != shape.beads) revert Planarity.BadPositions();

        address root = identity.getWhitelistedRoot(msg.sender);
        if (root == address(0)) revert NotVerified();

        uint256 found = Planarity.crossings(shape.edges, xs, ys);
        if (found != 0) revert StillTangled(found);

        Record storage record = records[root];
        if (record.lastAt == 0) _players.push(root);

        uint256 bit = 1 << id;
        bool first = record.freed & bit == 0;
        if (first) {
            record.freed |= bit;
            record.distinct += 1;
        }

        record.untangles += 1;
        record.lastAt = uint64(block.timestamp);
        emit Untangled(root, id, record.untangles, first);
    }

    function playerCount() external view returns (uint256) {
        return _players.length;
    }

    /**
     * A page of the board, unsorted — in the order people first appeared.
     *
     * Sorting happens where it is free. On-chain ranking means either writing a sorted
     * structure on every proof, which every player then pays for, or a loop that gets
     * slower every time somebody joins. The rows are small and the reads cost nothing, so
     * whoever is showing the board can order them however they like.
     */
    function page(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory roots, Record[] memory found) {
        uint256 total = _players.length;
        if (offset >= total) return (new address[](0), new Record[](0));

        uint256 count = total - offset;
        if (count > limit) count = limit;

        roots = new address[](count);
        found = new Record[](count);
        for (uint256 i = 0; i < count; i++) {
            address root = _players[offset + i];
            roots[i] = root;
            found[i] = records[root];
        }
    }
}
