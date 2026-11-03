// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * G$ attached to a gift link.
 *
 * A snarl gift is a creature carried in a URL fragment: no account at either end and
 * nothing stored anywhere. Money cannot ride in a fragment the same way, because a link
 * has no address behind it until somebody opens it. So the link carries a one-time key
 * instead, and this contract holds the money until whoever has that key asks for it.
 *
 * The key is a key, not a password. A gift is filed under the *address* that key derives
 * to, and claiming means signing a message with it — a message that names the wallet the
 * money is going to. That is the whole reason it is a signature and not a hash preimage:
 * a secret revealed in a public mempool can be copied by anyone watching and spent first,
 * and a signature over the recipient's own address cannot be re-aimed.
 *
 * Anyone may submit that signature. This is deliberate, not laxity — the person most
 * likely to be opening a gift link is someone who has never held a token and cannot pay
 * for a transaction. The signature decides where the money goes; whoever pays the gas
 * gains nothing by paying it.
 *
 * There is no owner. Nobody can pause this, sweep it, or change it, and tokens sent
 * straight to the contract rather than through `send` are gone. An escrow that somebody
 * can empty is not an escrow.
 */
contract SnarlGifts {
    using SafeERC20 for IERC20;

    struct Gift {
        address from;
        uint128 amount;
        /** When the sender may take an unopened gift back. */
        uint64 reclaimableAt;
        bool opened;
    }

    IERC20 public immutable token;

    /** Keyed by the address the link's one-time key derives to. */
    mapping(address key => Gift) public gifts;

    /** Long enough that nobody loses a gift to a race, short enough to be a window. */
    uint64 public constant MIN_WINDOW = 1 days;
    uint64 public constant MAX_WINDOW = 365 days;

    event Gifted(address indexed key, address indexed from, uint256 amount, uint64 reclaimableAt);
    event Opened(address indexed key, address indexed to, uint256 amount);
    event Reclaimed(address indexed key, address indexed from, uint256 amount);

    error KeyInUse();
    error NoGift();
    error AlreadyOpened();
    error NothingToGive();
    error BadWindow();
    error WrongKey();
    error NotYours();
    error TooSoon();

    constructor(IERC20 g$) {
        token = g$;
    }

    /**
     * Puts G$ behind a gift link. `key` is the address the link's one-time key derives
     * to; the key itself never comes near this contract until somebody claims with it.
     */
    function send(address key, uint256 amount, uint64 window) external {
        if (key == address(0)) revert WrongKey();
        if (gifts[key].from != address(0)) revert KeyInUse();
        if (amount == 0) revert NothingToGive();
        if (window < MIN_WINDOW || window > MAX_WINDOW) revert BadWindow();

        uint64 reclaimableAt = uint64(block.timestamp) + window;
        gifts[key] = Gift({
            from: msg.sender,
            amount: uint128(amount),
            reclaimableAt: reclaimableAt,
            opened: false
        });

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Gifted(key, msg.sender, amount, reclaimableAt);
    }

    /**
     * Opens a gift, paying `to`.
     *
     * `signature` is `digest(key, to)` signed by the link's one-time key. Because `to` is
     * inside what was signed, the signature is good for one destination and no other, so
     * it is safe in the open — which is what lets anyone pay the gas for it.
     *
     * Still open after the reclaim window: a gift nobody took back is still a gift.
     */
    function open(address key, address to, bytes calldata signature) external {
        Gift storage gift = gifts[key];
        if (gift.from == address(0)) revert NoGift();
        if (gift.opened) revert AlreadyOpened();
        if (to == address(0)) revert WrongKey();
        if (ECDSA.recover(digest(key, to), signature) != key) revert WrongKey();

        uint256 amount = gift.amount;
        gift.opened = true;
        token.safeTransfer(to, amount);
        emit Opened(key, to, amount);
    }

    /** Takes back a gift nobody opened. Only the sender, only after the window. */
    function reclaim(address key) external {
        Gift storage gift = gifts[key];
        if (gift.from == address(0)) revert NoGift();
        if (gift.from != msg.sender) revert NotYours();
        if (gift.opened) revert AlreadyOpened();
        if (block.timestamp < gift.reclaimableAt) revert TooSoon();

        uint256 amount = gift.amount;
        gift.opened = true;
        token.safeTransfer(msg.sender, amount);
        emit Reclaimed(key, msg.sender, amount);
    }

    /**
     * What the link's key has to sign. It names this contract and this chain, so a
     * signature made for one deployment cannot be replayed against another.
     */
    function digest(address key, address to) public view returns (bytes32) {
        return
            MessageHashUtils.toEthSignedMessageHash(
                keccak256(abi.encode("snarl gift", block.chainid, address(this), key, to))
            );
    }
}
