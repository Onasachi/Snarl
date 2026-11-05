# Deploy the Snarl trail market to Celo

**Deployment completed:** [`0xF55E8f7330B89659c7B835eA1043657A45393bdA`](https://celoscan.io/address/0xF55E8f7330B89659c7B835eA1043657A45393bdA).
Read-only Celo checks confirmed an exact match to this repository's compiled runtime,
including the production G$ token, identity registry, selected treasury and 10% fee.
The local frontend `.env` now uses this address and the production GoodDollar environment.
**Explorer verification completed:** the owner received Hardhat's successful
verification result for [SnarlTrails on CeloScan](https://celoscan.io/address/0xF55E8f7330B89659c7B835eA1043657A45393bdA#code).
Continue from **step 4** for production hosting, then step 5 for real-wallet
acceptance. Do not repeat the deployment for this release.

These commands deploy the new `SnarlTrails` contract. The existing gifts, names,
board and weekly contracts already have addresses in `contracts/DEPLOY.md` and
do not need to be deployed again for this release.

The trail contract permanently credits **90% to the creator and 10% to your
chosen treasury, `0xf6928F774B993588D76c30c380058Aa0A6c26684`**. Both recipients
withdraw their accumulated G$ from the market. The treasury cannot be changed
after deployment; this contract has no owner or upgrade mechanism.

## 1. Run checks and get a fresh gas estimate

From a terminal on this Mac:

```sh
cd /Users/0t41k1/Documents/snarl
pnpm test
pnpm check
pnpm build
pnpm --dir contracts test
FORK=1 pnpm --dir contracts exec hardhat test test/Fork.ts --grep 'SnarlTrails on a Celo fork'

export TRAIL_TREASURY=0xf6928F774B993588D76c30c380058Aa0A6c26684
env -u PRIVATE_KEY -u DEPLOY_TRAILS pnpm --dir contracts exec hardhat run scripts/deploy-trails.ts --network celo
```

The last command is read-only. It checks the chain, token, identity contract and
G$ decimals, then prints the constructor values and current gas estimate. It
does not create a contract. Fund the deployment wallet on **Celo Mainnet** with
native CELO for the quoted execution cost plus headroom for changing fees and
additional L2 fees. `estimatedMaxCelo` is an estimate, not a total-fee guarantee.
The deployment wallet can differ from the treasury and does not need GoodDollar
verification. This script uses CELO for gas and does not configure fee abstraction.

The read-only check on 5 November 2026 passed: 1,689,470 gas and approximately
0.680011675 CELO at the returned maximum gas price. Run it again before deploying;
no mainnet transaction was sent during this check.

[Celo's network documentation](https://docs.celo.org/learn/network/overview)
confirms chain ID `42220`, the `https://forno.celo.org` RPC and the CELO currency.

## 2. Deploy once

The following is for **zsh**, the shell on this machine. Enter the deployment
wallet's private key only at the hidden local terminal prompt, including its
`0x` prefix. Keep it out of chat and out of all `VITE_` variables.

```sh
read -rs 'PRIVATE_KEY?Deployment wallet private key (hidden): '
export PRIVATE_KEY
TRAIL_TREASURY=0xf6928F774B993588D76c30c380058Aa0A6c26684 DEPLOY_TRAILS=yes pnpm --dir contracts exec hardhat run scripts/deploy-trails.ts --network celo
unset PRIVATE_KEY
```

This step broadcasts a real transaction. The project reads shell environment
variables; `contracts/.env` is not automatically loaded by Hardhat.

Save the printed `VITE_SNARL_TRAILS=0x...` address and the deployment transaction
hash from the explorer. If the command is interrupted after broadcasting, check
the deployment wallet's transactions on CeloScan before retrying, to avoid
creating a second contract. Do not use `pnpm --dir contracts deploy:celo`: that
script deploys the older weekly contract.

## 3. Verify the deployed source

Use the address printed in step 2 and an Etherscan V2 API key. Verification does
not need the deployment private key. This repository already has the Hardhat 2
verification plugin configured.

The installed `hardhat-verify` 2.1.x needs the explicit Celo entry now included in
`etherscan.customChains`. `hardhat verify --list-networks` should list `celo` with
chain ID `42220`. Keep the API key as one string so the plugin uses the
[Etherscan V2 endpoint for Celo](https://api.etherscan.io/v2/chainlist).
Sourcify is explicitly disabled; it is not required for CeloScan verification.

```sh
read 'TRAILS_ADDRESS?New SnarlTrails contract address: '
read -rs 'ETHERSCAN_API_KEY?Etherscan API key (hidden): '
export ETHERSCAN_API_KEY
pnpm --dir contracts exec hardhat verify --network celo "$TRAILS_ADDRESS" \
  0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A \
  0xC361A6E67822a0EDc17D899227dd9FC50BD62F42 \
  0xf6928F774B993588D76c30c380058Aa0A6c26684
unset ETHERSCAN_API_KEY
```

These constructor arguments are the production G$ token, production GoodDollar
identity registry and your treasury, in that order. Check the verified contract's
`token`, `identity` and `treasury` getters against them. If indexing has not caught
up, retry verification later; do not redeploy. The command format follows the
[Hardhat 2 verification documentation](https://v2.hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify).

## 4. Configure and publish the frontend

Set these in your hosting provider's **production build environment**, using the
address from step 2:

```dotenv
VITE_SNARL_TRAILS=0xYourNewSnarlTrailsAddress
VITE_GOODDOLLAR_ENV=production
```

Preserve the existing `VITE_SNARL_GIFTS`, `VITE_SNARL_NAMES`, `VITE_SNARL_BOARD`,
`VITE_SNARL_WEEKLY` and wallet configuration. Vite embeds these values at build
time: setting them after a build will not update that build.

For a local production build in the same terminal:

```sh
VITE_SNARL_TRAILS="$TRAILS_ADDRESS" VITE_GOODDOLLAR_ENV=production pnpm build
```

Publish the resulting `dist/` through Cloudflare Pages, connected to the GitLab
mirror. Follow [the Cloudflare Pages setup](cloudflare-pages.md) for the build
settings and automatic GitHub → GitLab → Cloudflare deployment flow.

## 5. Test the production URL with real wallets

1. Connect a verified GoodDollar creator wallet on Celo. In Profile, check the
   complete address and identity root, then publish a playtested trail.
2. Use an independent second wallet with G$ to buy it, solve the three knots and
   receive the palette. A linked wallet of the creator cannot buy its own trail.
3. Confirm the purchase in Activity, then withdraw the creator's 90% credit and
   the treasury's 10% credit from their respective wallets. Verify both receipts
   in the explorer. Buying does not require GoodDollar verification.
4. Test the exact review URL on MiniPay and your supported login providers,
   including a whitelisted linked wallet. Development `?wallet=demo` does not
   operate in production and is not proof that these integrations work live.

The production catalogue starts empty; sample trails and transactions in the
local demo are simulations. See `GOODBUILDERS.md` for the pilot and usage evidence
still needed before the program review.
