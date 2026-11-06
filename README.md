# Snarl

**Untangle a knot. Free a creature. Restore a world.**

Snarl is a mobile web puzzle game on **Celo**. Move connected beads until none of their strings cross, reveal the creature hidden in the tangle, and bring it home to a growing pond. Small rescues build into an adventure through five connected places, followed by endless expeditions.

The game begins with play: no wallet or payment is required to start. **GoodDollar (G$)** adds optional hints and boosts, a marketplace where players can earn from the trails they create, and gifts that carry value between friends. Players can also record their puzzle results on Celo.

[Play Snarl](https://playsnarl.xyz) · [Source](https://github.com/Onasachi/Snarl) · [Deployment guide](docs/ADVENTURE_AND_GD_LAUNCH.md) · [GoodBuilders application](docs/GOODBUILDERS_SEASON_5_APPLICATION.md)

This README describes the implementation in this repository. Features on the hosted site depend on its published frontend version and configured contract addresses. The adventure and supply-shop contract is deployed; release details are tracked in the [launch guide](docs/ADVENTURE_AND_GD_LAUNCH.md).

## Contents

- [The game](#the-game)
- [GoodDollar and the game economy](#gooddollar-and-the-game-economy)
- [Gameplay records and scoring](#gameplay-records-and-scoring)
- [Run locally](#run-locally)
- [Configuration](#configuration)
- [Development and testing](#development-and-testing)
- [Architecture](#architecture)
- [Smart contracts](#smart-contracts)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Maintainer and licensing](#maintainer-and-licensing)

## The game

### A world built from little rescues

Snarl's story contains **100 levels across five chapters**, with twenty levels in each chapter.

| Chapter | Your goal |
| --- | --- |
| Quiet Pond | Rescue the first residents. |
| Reed Garden | Find their missing friends. |
| Firefly Marsh | Restore the lights. |
| Moonlit Lake | Discover where the tangles come from. |
| Hidden Spring | Restore the source of the pond. |

Every five levels, a story moment and changes to the scenery show what those rescues accomplish. Puzzle layouts have controlled starting-crossing ranges, increasing difficulty and easier recovery levels between harder stretches.

After level 100, **endless expeditions** arrange existing puzzle recipes into new sequences with transformed layouts, returning creatures and collection goals. Each twenty-stage expedition has a group of friends to reunite and an optional forty-star goal. Expeditions reuse the creature roster; further authored chapters can extend the story over time.

### The player journey

1. **Learn by playing.** A short tutorial introduces moving beads, clearing crossings and freeing creatures.
2. **Continue the adventure.** Home keeps the next rescue easy to find, and the world map shows progress and completed story levels to replay.
3. **Make the pond your own.** Meet rescued residents, build a collection and unlock pond palettes through completed creator trails.
4. **Choose extra help.** Three free hints return each day. Optional G$ supplies are available from Home, the marketplace and the puzzle screen.
5. **Share your progress.** Connect a wallet to record a rescue on Celo, or keep playing and record it later from the Scores screen.
6. **Explore beyond the story.** Play daily and weekly challenges, discover player-made trails and continue into expeditions.

Attempts are unlimited. Running out of hints does not stop play. Progress, collections and settings are saved in the browser using IndexedDB.

The interface includes touch and keyboard bead controls, undo, a calm view, reduced-motion support, sound controls, and night and paper themes. The frontend is built as a Progressive Web App; wallet and contract actions require a network connection.

## GoodDollar and the game economy

G$ connects **receiving income, choosing useful gameplay help, supporting creators and sharing value**. The adventure gives players a reason to return before any financial interaction.

### Receive G$

Eligible players can claim their daily GoodDollar UBI through Snarl. The claim follows GoodDollar's identity and eligibility rules. UBI comes from the GoodDollar protocol and is independent of winning a puzzle.

Creators can earn G$ from trail sales, and players can receive G$ attached to a creature gift.

### Optional supplies

| Supply | Bundle | Price | What it does |
| --- | --- | --- | --- |
| Hint bundle | 5 hints | 100 G$ | Points to a bead and a useful direction. |
| Helping hand | 3 uses | 150 G$ | Moves one bead to reduce crossings. |
| Firefly vision | 3 uses | 75 G$ | Reveals the creature's untangled shape for four seconds without moving the board. |

A purchase may require a G$ allowance approval followed by the purchase transaction. Snarl waits for a successful receipt before refreshing inventory. Supply payments go directly to the contract's immutable treasury.

Purchased quantities belong to the wallet and are recorded on-chain. **Consumption is currently saved on the device**, so this is not yet a synchronized cross-device inventory system. Clearing browser storage can reset local usage. Free daily and earned hints are consumed before purchased hints.

### Player-made trails and gifts

Creators combine creatures into three-puzzle trails. Players can preview the first puzzle for free, buy the full route with G$, replay it, and unlock its pond palette by completing it.

- **90% of a trail sale** is credited to its creator.
- **10%** is credited to Snarl's treasury.
- Creators withdraw their credited earnings through the marketplace contract.
- Creature gift links can optionally carry G$ for another player.

### When verification is required

| Action | Wallet required | GoodDollar verification required |
| --- | --- | --- |
| Play the adventure and use free hints | No | No |
| Record gameplay through SnarlGame | Yes, on Celo | No |
| Buy supplies or trails | Yes, on Celo | No |
| Claim daily GoodDollar UBI | Yes | Yes, under GoodDollar's rules |
| Publish creator trails | Yes | Yes |
| Use legacy identity-based names, Board records or weekly-pool entry | Yes | Yes, under those contracts' rules |

Holding G$ does not itself establish GoodDollar verification. Network fees apply to on-chain transactions, including gameplay records that spend no G$.

## Gameplay records and scoring

A rescue earns **10 points per starting crossing**, plus **25 points** for finishing at or below par without hints or boosts. Assisted rescues still earn crossing points. Each puzzle ID counts once per wallet in `SnarlGame`.

For example, clearing two starting crossings in one move, with a par of three and no help, earns **45 points**. Using a boost for that rescue earns **20 points**.

The client checks the player's actual solved drawing before hashing it. The contract records the puzzle ID, level, starting crossings, moves, par, assistance flag, solution hash and resulting points. The completion screen provides a transaction receipt link; locally saved results can also be recorded later.

**These are player-reported scores.** The contract validates field bounds and duplicate IDs, but does not independently verify play, authenticate a unique person or prevent fabricated metrics submitted directly to it. Scores do not authorize G$ payouts. Server-assisted verification is planned for a later release.

## Run locally

### Requirements

- **Node.js 24.11.1**, pinned in [`.node-version`](.node-version).
- **pnpm 10.33.0**, pinned in [`package.json`](package.json).
- A modern browser. A wallet is optional for ordinary play.

For a fresh checkout:

```sh
git clone https://github.com/Onasachi/Snarl.git
cd Snarl
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Open the URL printed by Vite. The usual default is `http://localhost:5173`; Vite may choose another port if it is occupied.

### Demo wallet

Append `?wallet=demo` to the local development URL, for example:

```text
http://localhost:5173/?wallet=demo
```

Demo mode provides simulated wallet, verification, G$ and contract flows for development. It sends no real transactions and is enabled only in development builds. The same query parameter does not enable a demo wallet in a production build.

For live wallet testing, remove the demo query parameter, configure the relevant deployed contracts, and connect a Celo wallet. Email/social login additionally requires Web3Auth configuration.

## Configuration

Use [`.env.example`](.env.example) as the frontend configuration reference. `.env` is ignored by Git; unused optional variables should remain unset.

| Variable | Purpose |
| --- | --- |
| `VITE_GOODDOLLAR_ENV` | GoodDollar SDK environment; the example uses `production`. |
| `VITE_WEB3AUTH_CLIENT_ID` | Public client ID for optional email/social login. |
| `VITE_WEB3AUTH_NETWORK` | Matching Web3Auth project network. |
| `VITE_SNARL_GAME` | Any-wallet gameplay records and G$ supplies. |
| `VITE_SNARL_TRAILS` | Creator publishing, trail purchases, earnings and activity. |
| `VITE_SNARL_GIFTS` | G$ attached to creature gifts. |
| `VITE_SNARL_NAMES` | Names associated with GoodDollar identities. |
| `VITE_SNARL_BOARD` | Legacy identity-based puzzle records. |
| `VITE_SNARL_WEEKLY` | Weekly community-pool functionality. |
| `VITE_API_URL` | Optional daily community-count service; leave unset unless that service is deployed. |

To enable the deployed game and supply contract locally:

```dotenv
VITE_SNARL_GAME=0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071
```

The game remains playable without contract addresses. Missing optional integrations are disabled or shown as previews. `VITE_SNARL_GAME` and `VITE_SNARL_BOARD` refer to different contracts and must not be interchanged.

**All `VITE_` values are public browser configuration.** Never put deployment private keys or service secrets in them. Configure production values in Cloudflare Pages and rebuild after changing them; editing a local `.env` does not update an existing hosted build. Web3Auth also needs the correct deployed origin allowed in its project settings.

## Development and testing

### Frontend commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm check` | Check formatting and lint rules with Biome. |
| `pnpm fix` | Apply Biome's available formatting and lint fixes. |
| `pnpm test` | Run the frontend test suite once. |
| `pnpm test:watch` | Run tests in watch mode. |
| `pnpm build` | Type-check and create the production build in `dist/`. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm run build:cloudflare` | Run lint, tests, type-checking and the production build. |

Tests cover puzzle geometry, exact integer crossing checks, generated story levels, expeditions, progression, inventory, boosts, wallet sessions and transaction confirmation/retry behavior.

### Contracts

The contracts are a separate Hardhat package with their own `package-lock.json`:

```sh
cd contracts
npm ci
npm run build
npm test
```

Ordinary contract tests run on a local Hardhat network. Celo integration tests are opt-in:

```sh
npm run test:fork
```

The fork suite reads a pinned Celo block through an RPC endpoint and simulates transactions locally. It does not spend mainnet funds. `FORK_RPC` and `FORK_BLOCK` can override the defaults in [`contracts/hardhat.config.ts`](contracts/hardhat.config.ts); changing the block may change the identity and balance assumptions used by its fixtures.

Contract deployment scripts read signer credentials from the process environment. The frontend build does not deploy contracts. See the [contract guide](contracts/DEPLOY.md) for verification and deployment commands.

### Story content

The one hundred story layouts are stored in [`src/data/adventure-levels.json`](src/data/adventure-levels.json). To regenerate and validate them from the repository root:

```sh
node scripts/adventure.mjs
pnpm exec biome format --write src/data/adventure-levels.json
pnpm exec vitest run test/adventure.test.ts
```

Treat published puzzle recipes and IDs as versioned content: changing a recorded puzzle's meaning requires a coordinated version change. Story text, chapter definitions and expedition sequencing live in [`src/game/adventure.ts`](src/game/adventure.ts).

## Architecture

| Layer | Implementation |
| --- | --- |
| Interface | React 18, TypeScript, Vite, CSS and SVG creature rendering. |
| Game engine | Seeded layouts, crossing geometry, hint selection and puzzle interaction logic. |
| Local state | Zustand with IndexedDB persistence through `idb-keyval`. |
| Wallets | Viem, injected/EIP-6963 wallet discovery, optional Web3Auth login and a development demo adapter. |
| GoodDollar | Citizen SDK integration for identity and UBI flows. |
| Contracts | Solidity, OpenZeppelin and Hardhat on Celo. |
| Quality checks | Vitest, Biome, TypeScript and Hardhat tests. |
| Hosting | Cloudflare Pages from a GitLab mirror of the GitHub repository. |

```text
src/
  engine/       Puzzle geometry, scrambles and hints
  data/         Creatures, themes and generated story layouts
  game/         Screens, progression, story, shop and local state
  render/       SVG creatures and shared icons
  wallet/       Live/demo adapters, identity and transaction handling
  market/       Creator trails, marketplace adapters and types
  chain/        Contract ABIs, roster and weekly definitions
  theme/        Themes and interface styles
  audio/        Sound and haptics
contracts/
  contracts/    Solidity contracts and test mocks
  scripts/      Deployment and read-only chain checks
  test/         Unit tests and optional Celo-fork tests
test/           Frontend and engine tests
scripts/        Content and asset generation utilities
worker/         Optional community-count service prototype
docs/           Product, deployment and GoodBuilders documentation
public/         Fonts, icons and static assets
reference/      Earlier design and prototype references
```

Guest progression and supply consumption live in the browser. Confirmed purchases and submitted gameplay records live on Celo. Wallet ownership does not currently synchronize a player's full adventure between devices.

The optional Worker prototype provides an unauthenticated daily completion counter. It is not a verified-user analytics service or a source of reward eligibility. Supabase verification is not implemented in this release.

## Smart contracts

All addresses below are on **Celo mainnet, chain ID 42220**.

| Contract | Address | Responsibility |
| --- | --- | --- |
| SnarlGame | [`0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071`](https://celoscan.io/address/0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071) | Player-reported gameplay, supply purchases and shop totals. |
| SnarlTrails | [`0xF55E8f7330B89659c7B835eA1043657A45393bdA`](https://celoscan.io/address/0xF55E8f7330B89659c7B835eA1043657A45393bdA) | Trail publishing, sales and creator/treasury credits. |
| SnarlGifts | [`0x06Cf5deeB69D331DCdf37897BDc5337ba663Ed2B`](https://celoscan.io/address/0x06Cf5deeB69D331DCdf37897BDc5337ba663Ed2B) | G$ gift-link escrow. |
| SnarlNames | [`0x608e899633239d46055838BB267Bbf13b067975b`](https://celoscan.io/address/0x608e899633239d46055838BB267Bbf13b067975b) | GoodDollar identity-linked names. |
| SnarlBoard | [`0xa0478a7fAE7917D42B0D99E0f3a307cfe9C01342`](https://celoscan.io/address/0xa0478a7fAE7917D42B0D99E0f3a307cfe9C01342) | Legacy identity-based puzzle records. |
| SnarlWeekly | [`0x4B901584C3AdD752a1bc25415D2a1997A7701612`](https://celoscan.io/address/0x4B901584C3AdD752a1bc25415D2a1997A7701612) | Weekly pools and verified participation. |

`SnarlGame` uses G$ at `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`, with eighteen decimals, and treasury `0xf6928F774B993588D76c30c380058Aa0A6c26684`. Its token, treasury and supply offers are fixed; it has no administrator or upgrade mechanism. Deployment does not imply that weekly pools are currently funded or open.

The game contract's runtime bytecode and settings were checked against this source on November 6, 2026. Read-only checks can be repeated using [`contracts/scripts/check-live.ts`](contracts/scripts/check-live.ts). Bytecode matching is distinct from publishing verified source on an explorer. See [deployment records](contracts/DEPLOY.md) for details.

## Deployment

The configured frontend release path is:

```text
GitHub Onasachi/Snarl
  → GitHub Actions mirror
  → GitLab Otaiki1/snarl
  → Cloudflare Pages build
  → playsnarl.xyz
```

Cloudflare builds the `master` branch with:

```sh
pnpm install --frozen-lockfile && pnpm run build:cloudflare
```

The output directory is `dist`. Production environment variables belong in the Cloudflare Pages project; the local `.env` remains untracked. A new contract address requires a frontend rebuild. Deploying a contract alone does not publish the interface that uses it.

Use the guides for the relevant part of a release:

- [Cloudflare Pages configuration](docs/cloudflare-pages.md)
- [GitHub to GitLab mirror](docs/gitlab-mirror.md)
- [Adventure and G$ shop launch](docs/ADVENTURE_AND_GD_LAUNCH.md)
- [Creator marketplace deployment](docs/MAINNET_DEPLOY.md)
- [Contract addresses, checks and deployment](contracts/DEPLOY.md)

## Roadmap

The next development priorities are:

- Complete production acceptance and onboard independent players and the first trail creators.
- Measure puzzle completion, return play, voluntary supply use and creator earnings.
- Add wallet-authenticated inventory synchronization and server-assisted result checking, with verified results distinguished from historical self-reported records.
- Expand authored story content, creature variety and creator discovery based on player feedback.

The [GoodBuilders Season 5 application](docs/GOODBUILDERS_SEASON_5_APPLICATION.md) includes proposed milestones, the Wallet Week journey and measurement definitions. Its growth targets are proposals, not current traction. Earlier planning notes in `PLAN.md` and `STATUS.md` may describe superseded ideas; use current implementation and release guides for shipped behavior.

## Contributing

Bug reports should include the browser, device, reproduction steps and whether the issue occurred in guest, demo or live-wallet mode. For transaction issues, include a public transaction hash when available; do not include private keys or secret gift-link material.

For code changes, keep the free-play path intact, explain the behavior being changed, and run the frontend checks. Add focused tests for gameplay, wallet or contract behavior that changes, and run the contract suite when modifying Solidity. Include screenshots for interface changes and update the relevant setup or deployment documentation.

## Maintainer and licensing

Snarl is maintained by **Samuel Onanike** — [@onasachi](https://github.com/onasachi).

There is currently no repository-wide `LICENSE` file. Solidity source files declare their own SPDX licenses, and dependencies retain their respective licenses. Public source availability should not be treated as a blanket license for every project asset.
