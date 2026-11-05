import type { Eip1193Provider } from "./provider";

/**
 * Signing in with Google, or an email, instead of installing a wallet.
 *
 * Web3Auth turns that login into an ordinary EIP-1193 wallet, so everything downstream —
 * the identity read, the claim, the pool, the gifts — carries on not knowing where the
 * wallet came from. It is an entrance, not a second system.
 *
 * What it does *not* do is make somebody a verified person. GoodDollar's face check is
 * tied to an address, and an address made by logging in with Google starts as unverified
 * like any other. It can go through that check — it is just an address — but the sign-in
 * is the easy half.
 *
 * Unset `VITE_WEB3AUTH_CLIENT_ID` and the option is simply not offered, the same way an
 * undeployed contract leaves its screen alone.
 *
 * Celo is pinned here rather than left to the Web3Auth dashboard. The SDK takes the chains
 * it is given and uses only those, so saying it in code means the wallet this makes is on
 * the right chain whatever a dashboard somewhere does or does not have switched on — one
 * fewer setting to get wrong in a place this repository cannot see.
 */
const CLIENT_ID = import.meta.env.VITE_WEB3AUTH_CLIENT_ID as string | undefined;
const NETWORK = (import.meta.env.VITE_WEB3AUTH_NETWORK as string | undefined) ?? "sapphire_mainnet";

export const socialLoginOffered = (): boolean => Boolean(CLIENT_ID);

/** The id the wallet sheet uses for this, kept out of the way of any real wallet's uuid. */
export const SOCIAL_ID = "snarl:social";

let opened: Eip1193Provider | null = null;

export async function connectSocially(): Promise<Eip1193Provider> {
  if (!CLIENT_ID) throw new Error("no-wallet");
  if (opened) return opened;

  // Imported here and nowhere else: it is a large dependency and most people will never
  // take this door, so they should not pay for it in the bundle they download to play.
  const { Web3Auth, CHAIN_NAMESPACES, WEB3AUTH_NETWORK } = await import("@web3auth/modal");

  const network =
    NETWORK === "sapphire_devnet"
      ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
      : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;

  // Web3Auth draws its own window, so it is told which way round the game currently is
  // rather than arriving white over a dark pond. `data-theme` is what the rest of the
  // app styles itself from, so it is the honest source.
  const paper = document.querySelector('[data-theme="paper"]') !== null;

  const web3auth = new Web3Auth({
    clientId: CLIENT_ID,
    web3AuthNetwork: network,
    uiConfig: { mode: paper ? "light" : "dark" },
    // Email and the social logins, and nothing else. Web3Auth's window offers MetaMask
    // and several hundred wallets of its own, which is a second, longer answer to a
    // question snarl has already asked with its own button — and a list of 414 wallets
    // is not a choice anybody wants to make. Wallets are the other button's business.
    //
    // No `modalConfig`. Trimming the window from here is not supported in any form that
    // works: naming some connectors makes the SDK dereference the ones left out, and
    // `hideWalletDiscovery` on its own makes it dereference the connector map that is
    // not there. Both throw inside an event handler during `init`, so the window still
    // opens and the login still succeeds and then there is no provider at the end of it
    // — a green tick followed by being put straight back outside the door.
    //
    // Which login methods and wallets the window offers belongs in Web3Auth's own
    // dashboard, where it is a setting rather than a guess at an undocumented shape.
    chains: [
      {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0xa4ec",
        rpcTarget: "https://forno.celo.org",
        displayName: "Celo",
        blockExplorerUrl: "https://celoscan.io",
        ticker: "CELO",
        tickerName: "Celo",
        // Required, and served from this app rather than from somebody else's CDN: the
        // login window should not have to reach a third party to draw an icon.
        logo: new URL("icons/icon-192.png", window.location.origin + import.meta.env.BASE_URL).href,
      },
    ],
    defaultChainId: "0xa4ec",
  });
  await web3auth.init();
  await web3auth.connect();

  const provider = web3auth.provider as Eip1193Provider | null;
  if (!provider) throw new Error("rejected");
  opened = provider;
  return provider;
}
