import { useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import { CREATURES } from "~/data";
import {
  type MarketState,
  PALETTES,
  type Trail,
  type TrailDraft,
  validDraft,
} from "~/market/types";
import { CreatureSvg } from "~/render/CreatureSvg";
import { ThemeProvider } from "~/theme/ThemeProvider";
import { formatAmount } from "~/wallet";
import type { useWallet } from "~/wallet/useWallet";

type Wallet = ReturnType<typeof useWallet>;
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
const initialDraft = () => {
  try {
    const saved = sessionStorage.getItem("snarl.trail.draft");
    if (saved)
      return JSON.parse(saved) as {
        title: string;
        price: string;
        seed: number;
        creatures: [number, number, number];
        palette: number;
      };
  } catch {
    /* fresh draft */
  }
  return {
    title: "",
    price: "60",
    seed: crypto.getRandomValues(new Uint32Array(1))[0]!,
    creatures: [0, 3, 6] as [number, number, number],
    palette: 1,
  };
};
export function TrailsScreen({
  wallet,
  onBack,
  onConnect,
  onVerify,
  onClaim,
  onPlay,
}: {
  wallet: Wallet;
  onBack: () => void;
  onConnect: () => void;
  onVerify: () => void;
  onClaim: () => void;
  onPlay: (trail: Trail, preview: boolean) => void;
}) {
  const [state, setState] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(() =>
    Math.floor(
      Math.max(0, Number(new URLSearchParams(window.location.search).get("trail")) || 0) / 20,
    ),
  );
  const [view, setView] = useState<"browse" | "create" | "impact">(() => {
    try {
      if (new URLSearchParams(window.location.search).has("trail")) return "browse";
      return sessionStorage.getItem("snarl.market.view") === "create" ? "create" : "browse";
    } catch {
      return "browse";
    }
  });
  const purchaseDialog = useRef<HTMLDialogElement>(null);
  const [quote, setQuote] = useState<Trail | null>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const account = wallet.account?.address;
  useEffect(() => {
    try {
      sessionStorage.setItem("snarl.market.view", view);
    } catch {
      /* optional UI memory */
    }
  }, [view]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref-backed wallet reads must refresh on account changes and explicit retries.
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setState(null);
    setQuote(null);
    void wallet
      .readMarket(page * 20)
      .then((s) => {
        if (current) setState(s);
      })
      .catch(() => {
        if (current)
          setError(
            "The Celo market could not be read. Your purchases have not changed. Try again.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [wallet.readMarket, account, page, revision]);
  useEffect(() => {
    try {
      sessionStorage.setItem("snarl.trail.draft", JSON.stringify(draft));
    } catch {
      /* optional draft persistence */
    }
  }, [draft]);
  useEffect(() => {
    if (quote) purchaseDialog.current?.showModal();
    else purchaseDialog.current?.close();
  }, [quote]);
  const recipe: TrailDraft = {
    ...draft,
    price: (() => {
      try {
        return /^\d+(\.\d{1,18})?$/.test(draft.price) ? parseUnits(draft.price, 18) : 0n;
      } catch {
        return 0n;
      }
    })(),
  };
  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setQuote(null);
      setNotice(message);
      refresh();
    } catch (cause) {
      const msg = String((cause as Error)?.message ?? cause);
      setError(
        /reject|denied|4001/i.test(msg)
          ? "Request cancelled. You can try again."
          : msg.includes("wrong-chain")
            ? "Switch your wallet to Celo, then try again."
            : "Could not confirm this transaction. Refresh to check its status before trying again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const previewDraft: Trail = {
    ...recipe,
    id: -1,
    creator: account ?? "0x0000000000000000000000000000000000000000",
    root: account ?? "0x0000000000000000000000000000000000000000",
    active: true,
    owned: true,
    title: draft.title || "Your trail",
  };
  return (
    <div className="sn-page">
      <header className="sn-page-head">
        <button type="button" className="sn-pill" onClick={onBack}>
          ← Pond
        </button>
        <span>Trail market</span>
        <button className="sn-pill" type="button" disabled={busy || loading} onClick={refresh}>
          Refresh
        </button>
      </header>
      <div className="sn-page-body">
        {state?.demo && (
          <p className="sn-demo">Demo market · sample trails · simulated G$, no real payments</p>
        )}
        <nav className="sn-tabs" aria-label="Market views">
          {(["browse", "create", "impact"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setQuote(null);
              }}
            >
              {v === "browse" ? "Explore" : v === "create" ? "Make a trail" : "Activity"}
            </button>
          ))}
        </nav>
        {error && (
          <p role="alert" className="sn-notice">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="sn-notice">
            {notice}
          </p>
        )}
        {loading && (
          <p role="status" className="sn-sub">
            Reading the trail market…
          </p>
        )}
        {!loading && !state && !error && (
          <p className="sn-notice">
            The G$ market is awaiting deployment. You can design and test a trail below; purchases
            and publishing will open when its contract is live.
          </p>
        )}
        {view === "browse" && (
          <>
            <span className="sn-eyebrow">Little journeys. Made by people.</span>
            <h1 className="sn-title">Follow a new thread.</h1>
            <p className="sn-sub">
              Try the first knot free. Keep all three and a new pond palette with G$. Every purchase
              pays the person who made it.
            </p>
            {!account && (
              <button className="sn-primary" type="button" onClick={onConnect}>
                Connect to see your trails & G$
              </button>
            )}
            {account && (
              <p className="sn-sub">
                {short(account)} ·{" "}
                {wallet.status ? formatAmount(wallet.status.balance, 18) : "Balance unavailable"}{" "}
                <button className="sn-link" type="button" onClick={onClaim}>
                  Daily G$
                </button>
              </p>
            )}
            {state?.trails
              .filter((t) => t.active || t.owned)
              .map((trail) => (
                <article className="sn-trail" key={trail.id} id={`trail-${trail.id}`}>
                  <TrailArt trail={trail} />
                  <div className="sn-trail-body">
                    <span className="sn-eyebrow">
                      3 knots · {PALETTES[trail.palette]?.name} water
                    </span>
                    <h2>{trail.title}</h2>
                    <p className="sn-sub">
                      By {short(trail.creator)}{" "}
                      {state.demo ? "· sample creator" : "· verified when published"}
                    </p>
                    <div className="sn-trail-actions">
                      <button
                        className="sn-primary"
                        type="button"
                        onClick={() => {
                          if (trail.owned) onPlay(trail, false);
                          else if (!account) onConnect();
                          else setQuote(trail);
                        }}
                        disabled={busy}
                      >
                        {trail.owned
                          ? "Play your trail"
                          : `Keep · ${formatAmount(trail.price, 18)}`}
                      </button>
                      <button className="sn-pill" type="button" onClick={() => onPlay(trail, true)}>
                        Try a knot
                      </button>
                    </div>
                    <button
                      className="sn-link"
                      type="button"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("trail", String(trail.id));
                        void navigator.clipboard
                          .writeText(url.toString())
                          .then(() => setNotice("Trail link copied."))
                          .catch(() => setError("The link could not be copied."));
                      }}
                    >
                      Copy trail link
                    </button>
                  </div>
                </article>
              ))}
            {state && state.count === 0 && (
              <div className="sn-empty">
                <h2>The first trail could be yours.</h2>
                <p>Choose three creatures, test your route, and set a G$ price.</p>
                <button className="sn-primary" type="button" onClick={() => setView("create")}>
                  Make the first trail
                </button>
              </div>
            )}
            {state && state.count > 20 && (
              <div className="sn-trail-actions">
                <button
                  type="button"
                  className="sn-pill"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  className="sn-pill"
                  type="button"
                  disabled={(page + 1) * 20 >= state.count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
            {!state && !loading && (
              <button type="button" className="sn-primary" onClick={() => setView("create")}>
                Design a trail
              </button>
            )}
          </>
        )}
        {view === "create" && (
          <>
            <span className="sn-eyebrow">Your taste. Their next adventure.</span>
            <h1 className="sn-title">Leave a trail.</h1>
            <p className="sn-sub">
              Curate three different creatures. The layouts, price and palette are fixed when
              published. You receive 90% of every sale; 10% supports Snarl.
            </p>
            <TrailArt trail={previewDraft} />
            <form
              className="sn-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (validDraft(recipe))
                  void run(
                    () => wallet.publishTrail(recipe),
                    "Your trail is published. Find it in Explore.",
                  );
              }}
            >
              <label>
                Trail name
                <input
                  value={draft.title}
                  maxLength={48}
                  placeholder="Where the lilies sleep"
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </label>
              <div className="sn-three">
                {draft.creatures.map((id, i) => (
                  <label key={i === 0 ? "first" : i === 1 ? "second" : "third"}>
                    Knot {i + 1}
                    <select
                      value={id}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          creatures: d.creatures.map((n, k) =>
                            k === i ? Number(e.target.value) : n,
                          ) as [number, number, number],
                        }))
                      }
                    >
                      {CREATURES.map((c, k) => (
                        <option value={k} key={c.id}>
                          {c.name} · par {c.par}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label>
                Finishing palette
                <select
                  value={draft.palette}
                  onChange={(e) => setDraft((d) => ({ ...d, palette: Number(e.target.value) }))}
                >
                  {PALETTES.map((p, i) => (
                    <option value={i} key={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                One-time price · G$
                <input
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                />
              </label>
              <p className="sn-sub">
                1–10,000 G$ per trail. No recurring charge. Publishing and withdrawals also require
                Celo gas.
              </p>
              <div className="sn-trail-actions">
                <button
                  className="sn-pill"
                  type="button"
                  disabled={new Set(draft.creatures).size !== 3}
                  onClick={() => onPlay(previewDraft, false)}
                >
                  Playtest all three
                </button>
                <button
                  className="sn-link"
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      seed: crypto.getRandomValues(new Uint32Array(1))[0]!,
                    }))
                  }
                >
                  New layouts
                </button>
              </div>
              {!account ? (
                <button type="button" className="sn-primary" onClick={onConnect}>
                  Connect to publish
                </button>
              ) : !wallet.status ? (
                <button type="button" className="sn-primary" onClick={() => void wallet.refresh()}>
                  Retry verification check
                </button>
              ) : !wallet.status.verified ? (
                <button type="button" className="sn-primary" onClick={onVerify}>
                  Verify with GoodDollar to publish
                </button>
              ) : (
                <button
                  type="submit"
                  className="sn-primary"
                  disabled={busy || !state || !validDraft(recipe)}
                >
                  {busy ? "Confirm in your wallet…" : "Publish trail"}
                </button>
              )}
            </form>
          </>
        )}
        {view === "impact" && (
          <>
            <span className="sn-eyebrow">G$ that does something</span>
            <h1 className="sn-title">Made. Played. Paid.</h1>
            <p className="sn-sub">
              {state?.demo
                ? "These are simulated transactions on this device."
                : "These totals are read directly from the Snarl trail contract on Celo. No projected or seeded usage."}
            </p>
            {state && (
              <>
                <div className="sn-metrics">
                  {[
                    ["Trail sales", String(state.sales)],
                    ["Buyer wallets", String(state.buyers)],
                    ["Repeat buyer wallets", String(state.repeatBuyers)],
                    ["Verified buyers", String(state.verifiedBuyers)],
                    ["Verified creators", String(state.creators)],
                    ["G$ spent", formatAmount(state.volume, 18)],
                    ["Creator revenue", formatAmount(state.creatorRevenue, 18)],
                    ["Snarl revenue", formatAmount(state.protocolRevenue, 18)],
                    ["Your withdrawable G$", formatAmount(state.credit, 18)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="sn-sub">
                  Verified buyers count unique GoodDollar identity roots at purchase time. Wallets
                  may belong to the same person. Sales measure purchases, not completed play or
                  active players. Creator earnings are withdrawable credits.
                </p>
                {state.credit > 0n && (
                  <button
                    className="sn-primary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(wallet.withdrawTrailEarnings, "Earnings withdrawn to your wallet.")
                    }
                  >
                    Withdraw {formatAmount(state.credit, 18)}
                  </button>
                )}
                {state.address && (
                  <a
                    className="sn-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://celoscan.io/address/${state.address}`}
                  >
                    Read the contract on CeloScan ↗
                  </a>
                )}
              </>
            )}
          </>
        )}
      </div>
      {quote && (
        <dialog
          ref={purchaseDialog}
          className="sn-purchase"
          aria-label="Review trail purchase"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setQuote(null);
          }}
        >
          {state?.demo && <p className="sn-demo">Simulated purchase · no real funds move</p>}
          <h2>Keep {quote.title}?</h2>
          <p>
            Three replayable knots and the {PALETTES[quote.palette]?.name} pond palette after
            finishing. Access belongs to this wallet.
          </p>
          <strong>{formatAmount(quote.price, 18)} once + network gas</strong>
          <p>
            Creator: {formatAmount((quote.price * 9n) / 10n, 18)} · Snarl:{" "}
            {formatAmount(quote.price / 10n, 18)}
          </p>
          <p className="sn-sub">
            Your wallet may ask for an exact G$ spending approval, then the purchase. Recipes are
            public. This is a curated route, not exclusive creatures.
          </p>
          {wallet.status && wallet.status.balance < quote.price ? (
            <button type="button" className="sn-primary" onClick={onClaim}>
              Get daily G$
            </button>
          ) : (
            <button
              type="button"
              className="sn-primary"
              disabled={busy || !wallet.status}
              onClick={() =>
                void run(
                  () => wallet.buyTrail(quote),
                  "Trail is yours. Finish it to colour your pond.",
                )
              }
            >
              {busy ? "Confirm in your wallet…" : "Confirm purchase"}
            </button>
          )}
          <button type="button" className="sn-link" disabled={busy} onClick={() => setQuote(null)}>
            Cancel
          </button>
        </dialog>
      )}
    </div>
  );
}
function TrailArt({ trail }: { trail: TrailDraft }) {
  const p = PALETTES[trail.palette] ?? PALETTES[0];
  return (
    <div
      className="sn-trail-art"
      style={{ background: p.water, color: p.color }}
      aria-hidden="true"
    >
      <svg aria-hidden="true" className="sn-trail-thread" viewBox="0 0 320 110">
        <path
          d="M-20 90 Q55 -35 100 60 T215 55 T350 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 6"
        />
      </svg>
      <ThemeProvider theme="night">
        {trail.creatures.map((id, i) => (
          <div
            key={String(i)}
            style={{
              transform: `translateY(${i === 1 ? -10 : 8}px) rotate(${i === 1 ? 8 : -6}deg)`,
            }}
          >
            <CreatureSvg creature={CREATURES[id]!} state="free" eyes="open" still />
          </div>
        ))}
      </ThemeProvider>
    </div>
  );
}
