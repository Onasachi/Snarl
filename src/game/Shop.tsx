import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "~/game/store";
import { emptySupplies, SUPPLIES } from "~/game/supplies";
import { formatAmount } from "~/wallet";
import type { GameMarket } from "~/wallet/game";
import type { Address } from "~/wallet/port";
import type { useWallet } from "~/wallet/useWallet";

export function ShopSheet({
  wallet,
  onConnect,
  onClaim,
  onClose,
}: {
  wallet: ReturnType<typeof useWallet>;
  onConnect: () => void;
  onClaim: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="sn-shop-dialog" aria-label="G$ supplies" onCancel={onClose}>
      <header className="sn-page-head">
        <span>G$ supplies</span>
        <button type="button" className="sn-pill" onClick={onClose}>
          Back to game ×
        </button>
      </header>
      <div className="sn-page-body">
        <Shop wallet={wallet} onConnect={onConnect} onClaim={onClaim} />
      </div>
    </dialog>
  );
}

export function Shop({
  wallet,
  onConnect,
  onClaim,
}: {
  wallet: ReturnType<typeof useWallet>;
  onConnect: () => void;
  onClaim: () => void;
}) {
  const [market, setMarket] = useState<GameMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [hash, setHash] = useState<Address | null>(null);
  const active = useRef(false);
  const account = wallet.account?.address;
  const generation = useRef(0);
  const syncSupplies = useGame((s) => s.syncSupplies);
  const spent =
    useGame((s) => (account ? s.supplySpent[account.toLowerCase()] : undefined)) ?? emptySupplies();
  const refresh = useCallback(async () => {
    const version = generation.current;
    setLoading(true);
    try {
      const result = await wallet.readGameMarket();
      if (version !== generation.current) return;
      setMarket(result);
      if (account && result) syncSupplies(account, result.supplies);
    } catch {
      if (version === generation.current)
        setNotice("The shop could not be reached. Refresh to check your purchases.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [account, wallet.readGameMarket, syncSupplies]);
  useEffect(() => {
    ++generation.current;
    setMarket(null);
    setHash(null);
    setNotice("");
    setBusy(false);
    void refresh();
    return () => {
      ++generation.current;
    };
  }, [refresh]);
  const buy = async (item: number) => {
    if (active.current || busy) return;
    if (!account) {
      onConnect();
      return;
    }
    active.current = true;
    const version = generation.current;
    setBusy(true);
    setHash(null);
    setNotice("Confirm the G$ approval, if requested, then confirm your purchase.");
    try {
      const result = await wallet.buySupply(item, {
        onSubmitted: (h) => {
          if (version === generation.current) {
            setHash(h);
            setNotice("Payment sent. Waiting for Celo confirmation…");
          }
        },
      });
      if (version !== generation.current) return;
      if (result.kind === "confirmed") setHash(result.hash);
      setNotice(
        result.kind === "demo"
          ? "Demo purchase complete. No real G$ was spent."
          : "Purchase confirmed. Your supplies are ready.",
      );
      await refresh();
      await wallet.refresh();
    } catch (cause) {
      if (version === generation.current) {
        const message = String(cause);
        setNotice(
          /rejected|denied|4001|transaction-cancelled/i.test(message)
            ? "Purchase cancelled. Your game is ready whenever you are."
            : /insufficient/i.test(message)
              ? "Your wallet needs enough G$ for the item and CELO for its network fee."
              : /wrong-chain/.test(message)
                ? "Switch your wallet to Celo to buy supplies."
                : /transaction-reverted/.test(message)
                  ? "Payment reverted. No supplies were purchased."
                  : "We couldn't confirm this purchase. Refresh your supplies or retry to check the pending transaction.",
        );
      }
    } finally {
      active.current = false;
      if (version === generation.current) setBusy(false);
    }
  };
  return (
    <section aria-labelledby="supplies-title">
      <span className="sn-home-eyebrow">GOODDOLLAR GOES FURTHER HERE</span>
      <h2 id="supplies-title" className="sn-adventure-title">
        A little help.
        <br />A bigger adventure.
      </h2>
      <p className="sn-sub">
        Spend G$ on hints and playful boosts. Attempts are unlimited, and three free hints return
        every day.
      </p>
      <div className="sn-shop-summary">
        <span>
          <strong>
            {wallet.status
              ? formatAmount(wallet.status.balance, wallet.status.decimals)
              : "G$ wallet"}
          </strong>
          <small style={{ display: "block", color: "var(--ink2)" }}>Your adventure budget</small>
        </span>
        <button type="button" className="sn-pill" onClick={wallet.account ? onClaim : onConnect}>
          {wallet.account ? "Claim daily G$" : "Connect"}
        </button>
      </div>
      {market?.demo && <p className="sn-demo">Demo shop · simulated payments and supplies.</p>}
      {!loading && !market && (
        <p className="sn-notice">Shop preview. Purchases will open when the shop launches.</p>
      )}
      {notice && (
        <p role="status" className="sn-notice">
          {notice}
        </p>
      )}
      {hash && (
        <a
          className="sn-link"
          href={`https://celoscan.io/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View payment on Celo ↗
        </a>
      )}
      {SUPPLIES.map((item) => (
        <article className="sn-supply" key={item.id}>
          <span className="sn-supply-symbol" aria-hidden="true">
            {item.icon}
          </span>
          <div>
            <h3>
              {item.name} <small>×{item.units}</small>
            </h3>
            <p>
              {item.detail}{" "}
              <strong>
                {Math.max(0, (market?.supplies[item.key] ?? 0) - spent[item.key])} available.
              </strong>
            </p>
            <button
              type="button"
              disabled={
                busy || loading || !market || Boolean(wallet.account && !wallet.account.onCelo)
              }
              onClick={() => void buy(item.id)}
            >
              {busy
                ? "Please wait…"
                : !account
                  ? `Connect · ${formatAmount(item.price, 18)}`
                  : `Buy · ${formatAmount(item.price, 18)}`}
            </button>
          </div>
        </article>
      ))}
      <p className="sn-sub" style={{ fontSize: 12 }}>
        A Celo network fee applies. Your wallet may request a G$ allowance before payment. Boost use
        is saved on this device; purchases belong to the connected wallet.
      </p>
      <button
        type="button"
        className="sn-link"
        disabled={busy || loading}
        onClick={() => void refresh()}
      >
        {loading ? "Reading supplies…" : "Refresh supplies"}
      </button>
      {market && (
        <div className="sn-story-moment">
          <span className="sn-home-eyebrow">
            {market.demo ? "DEMO ACTIVITY" : "PUBLIC SHOP ACTIVITY"}
          </span>
          <p>
            {market.sales.toString()} purchases · {formatAmount(market.volume, 18)} spent ·{" "}
            {market.buyers.toString()} buyers
          </p>
          {market.address && (
            <a
              className="sn-link"
              href={`https://celoscan.io/address/${market.address}`}
              target="_blank"
              rel="noreferrer"
            >
              View game contract ↗
            </a>
          )}
        </div>
      )}
    </section>
  );
}
