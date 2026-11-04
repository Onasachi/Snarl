// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IIdentityV2} from "./IIdentityV2.sol";

/**
 * Names, so the Great Untangle's entrants are people rather than addresses.
 *
 * One name per verified person, keyed by their GoodDollar identity root — the same key
 * the weekly pool counts entries by. That is what makes a name worth anything: claiming a
 * second one means being a second person, and being a second person means passing a face
 * check. A registry keyed by address would be a registry of whoever ran a loop fastest.
 *
 * Names are lowercase `a-z`, `0-9` and `_`, three to twenty characters. Not a style
 * choice: with no case and no Unicode there is no way to register a name that *looks*
 * like somebody else's. The pond is small and friendly and should stay that way.
 *
 * There is no owner. Nobody can rename or un-name anybody, and that includes us.
 *
 * Which is exactly why a handful of names are refused at birth. A registry with no owner
 * cannot take a name back, so `gooddollar` or `minipay` in a stranger's hands would be
 * permanent, on a contract snarl deployed, inside somebody else's ecosystem. The reserved
 * list is fixed in the constructor and emitted name by name, so what is blocked is
 * readable from the deployment's own logs. Nobody can hold these — not a squatter, and
 * not the organisations they name either. Better unheld than wrongly held.
 */
contract SnarlNames {
    IIdentityV2 public immutable identity;

    /** The name this person goes by, or "" for somebody who has not claimed one. */
    mapping(address root => string) public nameOf;
    /** Who holds a name, by its hash. Zero means free. */
    mapping(bytes32 nameHash => address root) private _holder;

    /** How many names have ever been claimed and not released. */
    uint256 public claimed;

    /** Names nobody may ever take, by hash. Set once, in the constructor. */
    mapping(bytes32 nameHash => bool) public reserved;

    event Claimed(address indexed root, string name, address indexed by);
    event Released(address indexed root, string name);
    event Reserved(string name);

    error NotVerified();
    error BadName();
    error NameTaken();
    error NameReserved();
    error NoName();

    constructor(IIdentityV2 identityContract, string[] memory reservedNames) {
        identity = identityContract;
        for (uint256 i = 0; i < reservedNames.length; i++) {
            // A reserved name has to be a name somebody could otherwise have claimed,
            // or reserving it protects nothing.
            if (!_valid(bytes(reservedNames[i]))) revert BadName();
            reserved[keccak256(bytes(reservedNames[i]))] = true;
            emit Reserved(reservedNames[i]);
        }
    }

    /** The person behind a name, or zero if nobody has it. */
    function rootOf(string calldata name) external view returns (address) {
        return _holder[keccak256(bytes(name))];
    }

    /** Several at once, so a leaderboard is one call rather than one call per row. */
    function namesOf(address[] calldata roots) external view returns (string[] memory names) {
        names = new string[](roots.length);
        for (uint256 i = 0; i < roots.length; i++) {
            names[i] = nameOf[roots[i]];
        }
    }

    /**
     * Takes a name. Claiming a second one gives up the first, so one person is one name
     * and old names come back into circulation rather than being hoarded.
     */
    function claim(string calldata name) external {
        if (!_valid(bytes(name))) revert BadName();

        address root = identity.getWhitelistedRoot(msg.sender);
        if (root == address(0)) revert NotVerified();

        bytes32 wanted = keccak256(bytes(name));
        if (reserved[wanted]) revert NameReserved();

        address holder = _holder[wanted];
        if (holder == root) return; // Already theirs; nothing to do and nothing to charge for.
        if (holder != address(0)) revert NameTaken();

        string memory old = nameOf[root];
        if (bytes(old).length != 0) {
            delete _holder[keccak256(bytes(old))];
            emit Released(root, old);
        } else {
            claimed += 1;
        }

        _holder[wanted] = root;
        nameOf[root] = name;
        emit Claimed(root, name, msg.sender);
    }

    /**
     * Gives a name up without taking another.
     *
     * Deliberately not gated on verification: somebody whose GoodDollar verification has
     * lapsed is still entitled to stop being called something, and asking them to re-verify
     * first would be a strange thing to insist on. Their own name is all they can touch.
     */
    function release() external {
        address root = identity.getWhitelistedRoot(msg.sender);
        if (root == address(0)) root = msg.sender;

        string memory old = nameOf[root];
        if (bytes(old).length == 0) revert NoName();

        delete _holder[keccak256(bytes(old))];
        delete nameOf[root];
        claimed -= 1;
        emit Released(root, old);
    }

    /** Lowercase, digits and underscore, 3–20 characters. Nothing that can wear a disguise. */
    function _valid(bytes memory name) private pure returns (bool) {
        if (name.length < 3 || name.length > 20) return false;
        for (uint256 i = 0; i < name.length; i++) {
            bytes1 c = name[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c == 0x5f;
            if (!ok) return false;
        }
        return true;
    }
}
