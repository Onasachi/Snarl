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
 * undeployed contract leaves its screen alone. The chains a project allows are configured
 * in Web3Auth's own dashboard rather than here, so that dashboard has to have Celo on it.
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
  const { Web3Auth } = await import("@web3auth/modal");

  const web3auth = new Web3Auth({
    clientId: CLIENT_ID,
    web3AuthNetwork: NETWORK as never,
  });
  await web3auth.init();
  await web3auth.connect();

  const provider = web3auth.provider as Eip1193Provider | null;
  if (!provider) throw new Error("rejected");
  opened = provider;
  return provider;
}
