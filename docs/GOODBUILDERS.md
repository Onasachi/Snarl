# Snarl · Season 5 implementation and launch record

Updated 5 November 2026. Treasury selected by the owner: `0xf6928F774B993588D76c30c380058Aa0A6c26684`.

Deployment update: the owner has deployed `SnarlTrails` to
[`0xF55E8f7330B89659c7B835eA1043657A45393bdA`](https://celoscan.io/address/0xF55E8f7330B89659c7B835eA1043657A45393bdA).
Read-only checks matched the complete runtime bytecode and all immutable addresses
against this repository. Local frontend configuration now uses it, and the owner
completed source verification on CeloScan. Production hosting and real-wallet
acceptance remain; deployment and verification alone do not establish usage.
Follow `MAINNET_DEPLOY.md` from step 4.

## Product hypothesis

People return to rescue creatures, finish a collection, restore their pond, and master new layouts. They spend G$ on curated player-made routes and pond palettes; creators earn from actual sales. UBI is a source of spending money, never a reward gated behind winning. No guaranteed earnings, random paid rewards, entry stakes or grant-funded purchase rebates.

The [official Season 5 announcement](https://medium.com/gooddollar/goodbuilders-season-5-is-now-open-build-something-people-and-agents-come-back-to-1ba98aee0b6c) says kickoff and streaming start November 9, with a working Celo product and meaningful G$ integration expected. Funding combines mentor/community votes and agreed metrics. The [Season 4 recap and Season 5 priorities](https://medium.com/gooddollar/goodbuilders-season-4-building-the-future-of-ubi-one-product-at-a-time-eb0f64929af2) emphasize sustainable utility, verified users, repeat spending and consistent reporting. November 9 is the kickoff, not a verified application deadline.

## Implemented

- Guest play before any wallet request; existing collection survives login and logout on the same device.
- World rescues continue directly into the next knot, with a separate keep-and-visit-pond action. After the first ten knots, captions identify repeat play as mastery.
- Journal with discovered/unknown creatures, best move counts, under-par badges, and pond restoration at 3 / 6 / 10 unique original creatures.
- At most ten unique resident species on screen; repeat rescues no longer overlap duplicate sprites.
- Marketplace with a free first-knot preview, three-knot routes, one-time G$ purchases, replay access, creator playtesting, three palette choices and completion rewards.
- Verified creators publish immutable titles, prices, recipes and palettes. Publication is permissionless after GoodDollar verification; purchases do not require verification. Existing free creatures remain free.
- 90% of sales credited to the publisher's wallet; 10% to the immutable Snarl treasury. Withdrawals do not depend on unexpired verification. Exact approvals, receipt-status checks, duplicate/self-purchase checks and reentrancy protection.
- Live Activity view reads sale counts, buyer wallets, repeat buyer wallets, unique verified buyer roots, creator roots, volume and both revenue shares. It does not label those figures DAU or retention. Demo figures are explicitly simulated and development-only.
- Wallet resumption remembers email and selected extension sessions. Provider discovery restores by stable wallet domain, with UUID compatibility. Account/network changes invalidate local identity and market access until reconnection. Failed identity reads are distinct from an unverified result; profile shows address, root, registry/environment and refresh.

## What is being sold

A curated, reproducible route through three existing creatures and a finishing palette. The seed, graph IDs and title are public on chain. This is not DRM or exclusive creature ownership. A small palette library alone is unlikely to sustain repeat spending; creator curation and future content quality need actual demand testing. Cosmetic progress remains local; purchase receipts belong to the purchasing wallet. Completing a trail again restores its palette after local progress is cleared.

## Contract and release

`contracts/contracts/SnarlTrails.sol` is a new ownerless, non-upgradeable deployment. Existing deployed gift, name, board and weekly contracts are untouched. V1 trail creature indices are the ten entries in `CREATURES` in their existing order; do not reorder that catalogue. New creatures can be appended without changing purchased V1 recipes.

Production token: `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`, 18 decimals. Production identity: `0xC361A6E67822a0EDc17D899227dd9FC50BD62F42`. These were exercised in the local Celo fork test. Run the explicit read-only preflight without a key:

```sh
env -u PRIVATE_KEY -u DEPLOY_TRAILS TRAIL_TREASURY=0xf6928F774B993588D76c30c380058Aa0A6c26684 pnpm --dir contracts exec hardhat run scripts/deploy-trails.ts --network celo
```

Actual deployment requires an authorized signer and `DEPLOY_TRAILS=yes`. After deployment, set `VITE_SNARL_TRAILS` to the returned address in the production build environment, verify the source on CeloScan, rebuild and deploy the frontend. Without the address, the app truthfully reports that the market is awaiting deployment. No sample trail or demo sale is shown as production activity.

## Validation and remaining launch work

Automated coverage: game geometry and persistence, trail validation and all sample layouts, duplicate resident handling, financial conservation, exact-price checks, linked-wallet self-sales, expired creator withdrawals, failed transfers, fee-on-transfer rejection, reentrant callbacks and repeat-buyer counts. A local Celo fork buys a trail using the production G$ and identity contracts, then withdraws both revenue shares. Fork transactions are simulations, not live usage.

Before the program review:

1. Deploy the reviewed market to Celo, verify its source, configure the production frontend and publish several carefully playtested routes with a verified creator wallet. No grant or personal funds were moved during implementation.
2. Test the exact production URL with the reviewer's wallet, at least one linked identity wallet, MiniPay and email login. Verify the environment and identity root on the profile. Desktop demo tests cannot substitute for device/provider testing.
3. Observe independent people playing without coaching. Record first rescue rate, second-knot starts, completed trails, purchases and voluntary returns; obtain consent before sending analytics to an external service. The existing anonymous Daily counter is not reliable user or retention evidence.
4. Agree numerical targets with the program. Suggested pilot experiments, not official requirements: 20 independent players, 5 independent verified creators, 10 organic purchases, 3 repeat buyers. Record D1/D7 return cohorts separately from on-chain purchases. Do not fund circular purchases to manufacture traction.

No retention percentage, live user count, or program acceptance claim is established by this implementation. The Activity screen provides financial evidence once people use the deployed market; behavioral retention still needs observation or a consented analytics pipeline.

### Validation record · 5 November

- `pnpm test`: 256 passing; `pnpm check` and production build pass.
- `pnpm --dir contracts test`: 89 passing; fork-only cases intentionally skipped in the offline suite.
- `FORK=1 ... --grep 'SnarlTrails on a Celo fork'`: the new real-token/identity purchase and withdrawal test passes on a local fork. It initially exposed a test treasury with an existing token stream; the fixture now uses a fresh recipient so balance deltas measure the purchase alone.
- Browser: guest play after sign-out; immediate-next rescue skips a species already earned from a trail; simulated verification and G$ claim; 60 G$ purchase; all three trail knots solved through drag controls; Dusk palette unlocked; creator publication; receipt persistence after reload; Activity totals; 320×568 journal/form with no horizontal overflow. No browser console errors observed.
- Production build retains existing wallet SDK chunk-size and worker-module warnings.
- Read-only Celo deployment preflight: 1,689,470 estimated gas, quoted maximum fee 402,500,000,000 wei/gas, estimated execution cost at that quote 0.680011675 CELO. Requote before signing; this is not a fixed total-fee guarantee. No deployment signer is currently configured, no mainnet deployment occurred, and no real funds moved.
