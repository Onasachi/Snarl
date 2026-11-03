// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * The slice of GoodDollar's identity contract this needs. On Celo mainnet it lives at
 * 0xC361A6E67822a0EDc17D899227dd9FC50BD62F42.
 *
 * A "root" is the address a person's identity hangs off. One human can link several
 * wallets to the same root, which is why entries are keyed by the root and not by the
 * address that happens to send the transaction.
 */
interface IIdentityV2 {
    function isWhitelisted(address account) external view returns (bool);

    function getWhitelistedRoot(address account) external view returns (address);
}
