# Deploying snarl's contracts

Four of them, independent of each other, all on Celo. Deploy any subset; the game copes
with each one being absent.

- **`SnarlWeekly`** — the Great Untangle's prize pool, and each person's run of weeks.
  Has an owner, who opens weeks.
- **`SnarlGifts`** — G$ attached to a gift link. Has no owner at all.
- **`SnarlNames`** — one name per verified person. Has no owner at all, and refuses a
  short list of names forever.
- **`SnarlBoard`** — how many knots each person has freed, and which creatures. Its owner
  can only add creatures to the roster: never change one, never remove one, never touch
  a score.

## There is no testnet

GoodDollar's identity registry is what makes the Great Untangle's pool mean anything: one
entry per verified person. That registry exists on Celo mainnet and nowhere else.

- **Alfajores** has been retired. `alfajores-forno.celo-testnet.org` no longer resolves.
- **Celo Sepolia** replaced it (chain `11142220`) and has **no GoodDollar on it**: G$,
  the identity registry and the UBI scheme are all absent at their known addresses.

A testnet deploy would therefore prove the plumbing and skip the only part that is
interesting. What stands in for a testnet is a **fork of Celo itself** — the real token,
the real registry, real verified humans, and no money at risk:

```
pnpm test:fork
```

That suite deploys the contract against the live addresses, has three accounts that
claimed UBI on Celo enter with Glint's real shape, settles the week, pays them, and rolls
what nobody collected into the next week. It is pinned to a block so it stays reproducible.

## What the fork found

GoodDollar's `IdentityV4` does not have a single authentication period. It has a ladder:

```
reverifyDaysOptions = [3, 180]      // live on Celo
```

`isWhitelisted` indexes that ladder by the account's `authCount`, so a person's **first**
verification lasts **three days**, and `authCount` cycles back to `0` after the long rung —
so this is not only a newcomer's problem. Meanwhile `authenticationPeriod()` reports `180`,
the longest rung, which is misleading if you read only that.

The week is seven days. So someone can verify on Monday, free the knot, enter the pool, and
be asking for re-verification by Thursday. Asking the registry again at collection time
would strand their share and sweep it away. The contract therefore asks **once, at entry**:
`collect` takes an address already recorded as an entrant at its word, and only falls back
to the registry for a linked wallet. `scripts/identity-expiry.ts` prints the live ladder.

## What you need

| | |
|---|---|
| A funded Celo key | `PRIVATE_KEY` in the environment. ~0.5 CELO covers the deploy. |
| An owner | **A multisig.** The owner opens weeks, pauses, and sweeps uncollected shares. |
| G$ for the pool | Optional. A week can open empty and anyone may `fund` it afterwards. |

Gas, at Celo's 200 gwei floor:

| | gas | CELO |
|---|---|---|
| deploy | 2,105,097 | 0.42 |
| `openKnot` + `approve` | ~300,000 | 0.06 |
| **`enter`** | **376,519** | **0.075** |
| `collect` | ~90,000 | 0.018 |

`enter` is the one that matters, because a player pays it. Inside MiniPay they pay it
through fee abstraction — out of their stablecoin balance, not in CELO — but they do pay
it. **A week's share has to be worth more than that**, or the button costs more than it
gives. Decide the pool size against the current G$ rate before funding anything; a week
that opens empty still awards Glint, which is what the screen promises.

## Deploy

```
cd contracts
PRIVATE_KEY=… OWNER=<multisig> pnpm hardhat run scripts/deploy.ts --network celo
```

It refuses to run if either GoodDollar address has no code on the network, and refuses to
make the deployer its own owner unless you say `I_ACCEPT_SINGLE_KEY_OWNER=yes`.

Then give the address to the app as `VITE_SNARL_WEEKLY`. Until that variable is set the
game behaves exactly as it did before there was a contract: the weekly screen counts the
player's own passes and promises nothing.

Verify the source while you are here:

```
CELOSCAN_API_KEY=… pnpm hardhat verify --network celo <address> \
  0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A \
  0xC361A6E67822a0EDc17D899227dd9FC50BD62F42 <owner>
```

## Deploying the gift escrow

```
PRIVATE_KEY=… pnpm hardhat run scripts/deploy-gifts.ts --network celo
```

Then `VITE_SNARL_GIFTS=<address>`. There is no owner to set and nothing to administer —
no pause, no sweep, no rescue. Tokens sent straight to it rather than through `send` are
gone, which is the price of nobody being able to empty it.

A gift's money goes up *before* its link exists, and the link is then the only key to it.
The app keeps the keys it escrowed so an unopened gift can be taken back after 30 days;
those keys survive "clear progress", because that money is not progress.

## Deploying names and the board

```
PRIVATE_KEY=… OWNER=<multisig> pnpm hardhat run scripts/deploy-board.ts --network celo
```

**`SnarlNames` reserves names in its constructor, and that is the only chance to.** It has
no owner, so nothing can take a name back once it is claimed — which would make
`gooddollar` or `minipay` in a stranger's hands permanent, on a contract we deployed,
inside somebody else's ecosystem. The list is in `test/fixtures/reserved.json`, hashed on
chain and emitted name by name so the deployment's own logs say what is blocked. Nobody
can hold these afterwards, including the organisations they name: better unheld than
wrongly held. Reserving nineteen names costs about 0.1 CELO.

Then put the game's creatures on the roster, so a proof is checked against the shape snarl
actually ships rather than one the sender invented:

```
BOARD=<address> PRIVATE_KEY=… pnpm hardhat run scripts/register-roster.ts --network celo
```

Safe to run again — anything already registered is skipped, and `addCreature` refuses to
overwrite. **A creature's number is permanent**: it is part of every record anybody has
ever filed about it. The numbers live in `test/fixtures/roster.json` and are pinned by a
test in the app; never renumber one, and give a new creature the next free number.

Then `VITE_SNARL_NAMES` and `VITE_SNARL_BOARD`. With the board unset the game keeps score
only for itself, exactly as before, and The Board row does not appear in the menu.

## Opening a week

```
WEEKLY=<address> WEEK=2026-W45 AMOUNT=120000 \
  pnpm hardhat run scripts/open-week.ts --network celo
```

The knot, the week's number and its timestamps all come from the game's own files
(`test/fixtures/`), checked against the game's `weekKey`, `weekId` and creature by
`test/chain-fixtures.test.ts` in the app. Nothing here is typed in by hand.

**Weeks must overlap.** The game's week is the player's *local* ISO week, and the
contract's is one timestamp, so for a day or so either side of Monday the two disagree
about which week it is — by up to 26 hours, UTC+14 to UTC-12. The table handles this:

- `closesAt` is **Monday 12:00 UTC**, which is Sunday midnight for the last player on earth.
- `openBy` is **Sunday 10:00 UTC**, which is Monday midnight for the first.
- `sweepableAt` is **ninety days** after that. The contract permits any window; this is a
  phone game whose players are claiming a daily UBI, and a share somebody earned should
  not be swept away because they put the phone down for a fortnight.

So open week *N+1* before week *N* closes. Both are open for 26 hours and nobody falls
between them. `open-week.ts` warns if you are late.

## Two things `sweep` will not do

Both would destroy money rather than move it, and both are one wrong argument away:

- **A week into itself.** `from` and `into` would be the same storage slot — the pool
  comes back whole while every entrant's share is zeroed, and `locked` keeps counting it,
  so nobody can collect and nothing can be rescued. Refused with `SameKnot`.
- **Into a week that has already settled.** Its share is frozen, so G$ arriving afterwards
  could never be collected by anyone. Refused with `AlreadySettled`.

## Still not done

- Nothing here has run against a real wallet. The fork tests impersonate; they do not sign
  with a wallet a person controls.
- Nobody pays the gas for someone else's claim. `open` allows it; no service does it.
