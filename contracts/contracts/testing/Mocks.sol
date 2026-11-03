// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {IIdentityV2} from "../IIdentityV2.sol";
import {Planarity} from "../Planarity.sol";

/** Stands in for G$ in tests. Eighteen decimals, as on Celo. */
contract MockG is ERC20 {
    constructor() ERC20("Mock GoodDollar", "G$") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/** Stands in for GoodDollar's identity contract. */
contract MockIdentity is IIdentityV2 {
    mapping(address => address) public rootOf;

    function link(address account, address root) external {
        rootOf[account] = root;
    }

    function isWhitelisted(address account) external view returns (bool) {
        return rootOf[account] != address(0);
    }

    function getWhitelistedRoot(address account) external view returns (address) {
        return rootOf[account];
    }
}

/** Exposes the library so the geometry can be tested on its own. */
contract PlanarityHarness {
    function crossings(
        bytes memory edges,
        int256[] memory xs,
        int256[] memory ys
    ) external pure returns (uint256) {
        return Planarity.crossings(edges, xs, ys);
    }

    function isUntangled(
        bytes memory edges,
        int256[] memory xs,
        int256[] memory ys
    ) external pure returns (bool) {
        return Planarity.isUntangled(edges, xs, ys);
    }
}
