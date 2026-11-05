// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIdentityV2} from "./IIdentityV2.sol";

/// @notice Fixed-price puzzle collections. Recipes are public, not copy protection.
/// Purchases license the trail and its palette in Snarl. No investment or prize promise.
/// No admin, upgrades, changing purchased content, or discretionary withdrawals.
contract SnarlTrails is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Trail {
        address creator;
        address root;
        uint96 price;
        uint32 seed;
        uint8[3] creatures;
        uint8 palette;
        bool active;
        string title;
    }
    IERC20 public immutable token;
    IIdentityV2 public immutable identity;
    address public immutable treasury;
    uint256 public constant FEE_BPS = 1000;
    uint256 public constant MAX_PRICE = 10000 ether; // Celo G$ has 18 decimals.
    Trail[] private _trails;
    mapping(address => mapping(uint256 => bool)) public purchased;
    mapping(address => uint256) public credit;
    mapping(address => bool) public seenBuyer;
    mapping(address => bool) public seenVerifiedBuyer;
    mapping(address => bool) public seenCreator;
    uint256 public sales;
    uint256 public buyers;
    uint256 public repeatBuyers;
    mapping(address => uint256) public purchasesByBuyer;
    uint256 public verifiedBuyers;
    uint256 public creators;
    uint256 public volume;
    uint256 public creatorRevenue;
    uint256 public protocolRevenue;
    uint256 public liability;

    error Invalid();
    error NotVerified();
    error NotCreator();
    error Unavailable();
    error AlreadyOwned();
    error SelfPurchase();
    error PriceChanged();
    error NothingToWithdraw();
    error UnsupportedToken();
    event Published(uint256 indexed id, address indexed creator, address indexed root, uint256 price);
    event Purchased(uint256 indexed id, address indexed buyer, address indexed root, uint256 paid, uint256 creatorShare);
    event Availability(uint256 indexed id, bool active);
    event Withdrawn(address indexed account, uint256 amount);

    constructor(IERC20 token_, IIdentityV2 identity_, address treasury_) {
        if (address(token_).code.length == 0 || address(identity_).code.length == 0 || treasury_ == address(0)) revert Invalid();
        token = token_; identity = identity_; treasury = treasury_;
    }

    function publish(string calldata title, uint96 price, uint32 seed, uint8[3] calldata creatures_, uint8 palette) external returns (uint256 id) {
        address root = identity.getWhitelistedRoot(msg.sender);
        if (root == address(0)) revert NotVerified();
        if (bytes(title).length < 3 || bytes(title).length > 48 || price < 1 ether || price > MAX_PRICE || palette > 2) revert Invalid();
        // The immutable v1 catalogue: the game's ten original creatures, in data order.
        for (uint256 i; i < 3; ++i) {
            if (creatures_[i] >= 10) revert Invalid();
            for (uint256 j; j < i; ++j) if (creatures_[i] == creatures_[j]) revert Invalid();
        }
        id = _trails.length;
        _trails.push(Trail(msg.sender, root, price, seed, creatures_, palette, true, title));
        if (!seenCreator[root]) { seenCreator[root] = true; ++creators; }
        emit Published(id, msg.sender, root, price);
    }

    function setActive(uint256 id, bool active) external {
        Trail storage t = _trails[id];
        if (t.creator != msg.sender) revert NotCreator();
        t.active = active;
        emit Availability(id, active);
    }

    function buy(uint256 id, uint256 expectedPrice) external nonReentrant {
        Trail storage t = _trails[id];
        if (!t.active) revert Unavailable();
        if (purchased[msg.sender][id]) revert AlreadyOwned();
        if (expectedPrice != t.price) revert PriceChanged();
        address root = identity.getWhitelistedRoot(msg.sender);
        if (msg.sender == t.creator || (root != address(0) && root == t.root)) revert SelfPurchase();
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), t.price);
        if (token.balanceOf(address(this)) - beforeBalance != t.price) revert UnsupportedToken();
        purchased[msg.sender][id] = true;
        uint256 fee = uint256(t.price) * FEE_BPS / 10000;
        uint256 share = t.price - fee;
        credit[t.creator] += share;
        credit[treasury] += fee;
        liability += t.price;
        if (purchasesByBuyer[msg.sender]++ == 1) ++repeatBuyers;
        ++sales; volume += t.price; creatorRevenue += share; protocolRevenue += fee;
        if (!seenBuyer[msg.sender]) { seenBuyer[msg.sender] = true; ++buyers; }
        if (root != address(0) && !seenVerifiedBuyer[root]) { seenVerifiedBuyer[root] = true; ++verifiedBuyers; }
        emit Purchased(id, msg.sender, root, t.price, share);
    }

    /// Earnings remain withdrawable after identity expiry and delisting.
    function withdraw() external nonReentrant {
        uint256 amount = credit[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        credit[msg.sender] = 0; liability -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
    function count() external view returns (uint256) { return _trails.length; }
    function trail(uint256 id) external view returns (Trail memory) { return _trails[id]; }
    function page(uint256 offset, uint256 limit) external view returns (Trail[] memory result) {
        if (limit > 50) revert Invalid();
        uint256 n = _trails.length;
        if (offset >= n) return new Trail[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        result = new Trail[](end - offset);
        for (uint256 i; i < result.length; ++i) result[i] = _trails[offset + i];
    }
}
