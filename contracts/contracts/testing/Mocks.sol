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

/** Adversarial payment token: callbacks during transfer and fee-on-transfer behavior. */
contract CallbackG is ERC20 {
    address public target;
    bytes public attack;
    bool public blocked;
    bool public takeFee;
    constructor() ERC20("Callback G", "G$") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function configure(address target_, bytes calldata attack_, bool fee_) external { target=target_; attack=attack_; takeFee=fee_; }
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (target != address(0)) { (bool ok,) = target.call(attack); blocked = !ok; }
        bool result = super.transferFrom(from, to, amount);
        if (takeFee) _burn(to, 1);
        return result;
    }
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (target != address(0)) { (bool ok,) = target.call(attack); blocked = !ok; }
        return super.transfer(to, amount);
    }
}
