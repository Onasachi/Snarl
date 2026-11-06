# Adventure, gameplay records and the G$ shop

Implementation status: `SnarlGame` is deployed on Celo at [`0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071`](https://celoscan.io/address/0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071). Its runtime bytecode, token, treasury and bundle settings matched this repository in a read-only check on November 6, 2026 at block 82,064,989. An unverified wallet successfully simulated `recordRun`. Recorded runs, sales and G$ volume were all zero at that check.

The ignored local `.env` contains this `VITE_SNARL_GAME` address, and Samuel confirmed that the Cloudflare environment variables have been added. The updated frontend still needs publishing through GitLab/Cloudflare. The GoodBuilders draft separates the deployed contract and prepared frontend from real user activity. The bytecode check does not publish source verification on CeloScan.

## Player journey

1. Learn to untangle through the existing tutorial, then choose **Continue adventure** on Home.
2. Play five chapters of twenty levels: Quiet Pond, Reed Garden, Firefly Marsh, Moonlit Lake and Hidden Spring. Each chapter has four story moments, with scenery restored every five levels. Saved progress unlocks the next level; completed story levels can be replayed from the world map.
3. See the starting crossings, moves and par while playing. A recorded rescue earns ten points per starting crossing, plus twenty-five for finishing at or below par without hints or boosts. An assisted rescue still earns its crossing points. A puzzle contributes once per wallet.
4. At completion, connect any wallet and select **Record rescue on Celo**. Confirm the transaction and its network fee. GoodDollar identity verification is not requested. **Keep playing · record later** preserves the result on the device; the Scores screen offers up to five outstanding results at a time.
5. Spend G$ on optional supplies from Home, the marketplace or the puzzle toolbar. There are unlimited attempts and three free hints each day. Purchases never gate progression.
6. After level 100, continue through endless expeditions. Each twenty-stage expedition mixes existing puzzle recipes with transformed layouts and a new sequence, a roster of friends to reunite and an optional forty-star goal. These reuse the current creature roster; they do not add infinitely many authored creatures or story chapters.

## G$ supplies

| Item | Bundle | Price | Effect |
| --- | --- | --- | --- |
| Hint bundle | 5 hints | 100 G$ | Points to a bead and a useful direction. Free daily and earned hints are used first. |
| Helping hand | 3 uses | 150 G$ | Moves one bead to reduce crossings. Does not consume a use if no improving move is found. |
| Firefly vision | 3 uses | 75 G$ | Shows the creature's untangled shape for four seconds without moving the board. |

The wallet approves the exact bundle price if its allowance is insufficient, then confirms the purchase. The UI waits for a successful receipt before refreshing inventory. Failed or reverted payments do not credit supplies. Pending transaction hashes survive a tab reload, so retrying checks the existing payment instead of sending it again.

Purchases are cumulative on-chain and belong to the buying wallet. Consumption is currently saved in IndexedDB on the device, separately for each wallet. Clearing game progress preserves purchased and used supply counts; clearing browser storage or using another device can reset usage. This is the agreed frontend-only phase, not a cross-device entitlement system.

## What the contract proves

`contracts/contracts/SnarlGame.sol` has no GoodDollar identity gate, administrator or upgrade mechanism.

- `recordRun` emits `RunRecorded` with the sender, puzzle ID, level, starting crossings, moves, par, assistance flag, points and solution hash. It checks field bounds and prevents an identical puzzle ID from being counted twice by the same wallet.
- The frontend checks that the actual solved drawing has no crossings, including after integer encoding, before creating its hash. The celebration's canonical creature drawing is not substituted for the player's solution.
- The contract **does not verify** that the puzzle was played, that the supplied metrics are true, or that the sender is a unique person. Direct callers can submit fabricated results. The leaderboard is labelled player-reported, and its points do not authorize G$ payouts.
- `buy` transfers G$ directly to an immutable treasury, emits `SuppliesPurchased`, and updates purchased units, purchase count, unique buying wallets and G$ volume. It verifies the exact treasury balance increase and guards reentrancy. The contract holds no shop revenue for later withdrawal.

For Celo/GoodBuilders reporting, use confirmed contract transactions and events. Report wallets as wallets, not verified people; distinguish gameplay records, purchases and token-approval transactions. Demo activity and local-fork transactions do not count as production usage.

GoodDollar still controls the identity requirements for its daily UBI claim. Existing legacy Board, weekly rewards and trail publishing retain their own contract requirements. `VITE_SNARL_BOARD` continues to point at the legacy Board; it must not be repointed to `SnarlGame`.

## Deploy and enable

The contract is already deployed; do not deploy another copy for this release. Continue from source verification/build configuration below. Steps 1–3 document how this deployment was prepared.

1. The project owner confirmed the existing Trails treasury, `0xf6928F774B993588D76c30c380058Aa0A6c26684`, as the destination for supply payments. The new contract's treasury and prices cannot be changed after deployment.
2. From `contracts/`, run the read-only preflight with the selected treasury:

   ```sh
   GAME_TREASURY=0xYourTreasuryAddress pnpm exec hardhat run scripts/deploy-game.ts --network celo
   ```

   The script checks chain 42220 and the canonical G$ token `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` with 18 decimals. It does not broadcast by default. A preflight on November 6, 2026 using the existing treasury estimated 1,013,417 gas and about 0.408 CELO at the returned maximum fee; rerun for current fees before signing.
3. Once the treasury and deployment are approved, use a securely configured deployment signer and explicitly enable broadcasting:

   ```sh
   GAME_TREASURY=0xYourTreasuryAddress DEPLOY_GAME=yes pnpm exec hardhat run scripts/deploy-game.ts --network celo
   ```

   The existing Hardhat configuration reads `PRIVATE_KEY` from its process environment. Never commit a private key or put it in any `VITE_` variable. Save the deployment receipt and the printed `VITE_SNARL_GAME` address.
4. Verify the deployed contract on CeloScan using the same token and treasury constructor arguments:

   ```sh
   pnpm exec hardhat verify --network celo 0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A 0xf6928F774B993588D76c30c380058Aa0A6c26684
   ```

5. In **Cloudflare > Workers & Pages > the Snarl Pages project > Settings > Environment variables**, add `VITE_SNARL_GAME` with the deployed address for Production. Set Preview separately if needed. Keep all existing contract variables.
6. Commit and push the release through the existing GitHub → GitLab mirror, and rebuild Cloudflare Pages. Vite reads the variable at build time. Without it, the app shows the shop as a preview and omits the recording action; it does not fabricate successful transactions.
7. On the production URL, use a wallet without active GoodDollar verification to record a completed rescue. Check its successful receipt and matching event. Then approve and buy a bundle, check the exact G$ transfer to the chosen treasury, and confirm inventory and shop totals. These real wallet transactions must be signed by their owner.

## Validation and the later backend

Validated locally on November 6, 2026:

- Frontend lint, all 299 frontend tests, TypeScript and the production build passed.
- The full offline contract suite passed all 98 tests, including nine SnarlGame cases. Twenty fork-only tests were skipped by that offline run.
- The focused Celo-fork integration passed using the actual G$ implementation, an unverified player and a fresh treasury without pre-existing streams. Existing broader fork tests were not rerun in this change.
- Browser demo checks covered an unverified rescue record, the 45-point score, progression to level two, a 150 G$ bundle purchase, consuming a Helping hand, reload persistence and an insufficient-balance purchase. No browser console errors were found in the final check. Demo checks used no real funds.

The production build retains warnings from the existing wallet dependencies about large chunks, a mixed static/dynamic import and a browser-externalized Node module. These did not fail the build; a production wallet smoke test remains part of deployment acceptance.

The frontend suite covers all one hundred story recipes, exact crossing counts, expedition goals, progression, wallet-scoped inventory, boost behavior, preservation of the player's solved drawing, payment confirmation/retries and the no-identity gameplay adapter. The Solidity suite covers ordinary wallets, score calculation, duplicate prevention, bundle prices, purchase accounting, failed payments, reentrant callbacks and transfer shortfalls.

Run the frontend checks with `pnpm check && pnpm test && pnpm build`. Run the offline contracts with `pnpm exec hardhat test` inside `contracts/`. The focused integration rehearsal is:

```sh
FORK=1 pnpm exec hardhat test test/Fork.ts --grep 'SnarlGame on a Celo fork'
```

That command forks the repository's pinned Celo block and simulates an unverified wallet recording and buying all three bundles with the real G$ token implementation. It sends no mainnet transactions.

Supabase is not implemented in this release. A later server should authenticate wallet ownership, issue or track runs, recompute valid puzzle results, deduplicate submissions and synchronize consumption. Verified rankings can then be kept separate from historical self-reported scores. Because this contract is immutable, adding contract-enforced server attestations would require a separate verifier or a new contract; adding Supabase alone cannot retroactively verify these records.
