import { useEffect, useState } from "react";
import { CREATURES } from "~/data";
import type { MarketState, Trail } from "~/market/types";
import { CreatureSvg } from "~/render/CreatureSvg";
import { Icon } from "~/render/Icon";
import { formatAmount } from "~/wallet";

export function FeaturedTrails({
  readMarket,
  account,
  onBrowse,
  onPreview,
}: {
  readMarket: () => Promise<MarketState | null>;
  account?: string;
  onBrowse: () => void;
  onPreview: (trail: Trail) => void;
}) {
  const [market, setMarket] = useState<MarketState | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ownership is scoped to the account, while readMarket is stable.
  useEffect(() => {
    let current = true;
    setMarket(null);
    setState("loading");
    void readMarket().then(
      (result) => {
        if (!current) return;
        setMarket(result);
        setState("ready");
      },
      () => {
        if (current) setState("error");
      },
    );
    return () => {
      current = false;
    };
  }, [readMarket, account, retry]);
  const trails = market?.trails.filter((trail) => trail.active).slice(0, 2) ?? [];
  return (
    <section className="sn-home-trails" aria-labelledby="home-trails-title">
      <div className="sn-home-section-head">
        <h2 id="home-trails-title">Player-made trails</h2>
        <button type="button" onClick={onBrowse}>
          All trails <Icon name="chevron" size={13} />
        </button>
      </div>
      {market?.demo && <p className="sn-home-demo">Demo trails · simulated G$</p>}
      {trails.length > 0 ? (
        <div className="sn-home-trail-shelf">
          {trails.map((trail) => (
            <button
              key={trail.id}
              className="sn-home-trail"
              data-palette={trail.palette}
              type="button"
              onClick={() => onPreview(trail)}
              aria-label={`Try ${trail.title}, first puzzle free`}
            >
              <span className="sn-home-trail-art" aria-hidden="true">
                <svg viewBox="0 0 160 65" fill="none" aria-hidden="true">
                  <path d="M-5 50C32 83 36 8 77 22S129 72 165 20" />
                </svg>
                {trail.creatures.map((index) => (
                  <span key={index}>
                    <CreatureSvg
                      creature={CREATURES[index]!}
                      state="free"
                      eyes="open"
                      r={5}
                      sw={2}
                      still
                    />
                  </span>
                ))}
              </span>
              <span className="sn-home-trail-title">{trail.title}</span>
              <span className="sn-home-trail-meta">
                <span>First puzzle free</span>
                <span>{trail.owned ? "Yours" : formatAmount(trail.price, 18)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="sn-home-market-empty" aria-live="polite">
          <span className="sn-home-empty-art" aria-hidden="true">
            <CreatureSvg creature={CREATURES[3]!} state="free" r={4} sw={2} still />
          </span>
          <div>
            <strong>
              {state === "loading"
                ? "Finding little adventures…"
                : state === "error"
                  ? "Trails couldn't load."
                  : !market
                    ? "New trails are on the way."
                    : market.count > 0
                      ? "Find your next trail in the market."
                      : "The first trail could be yours."}
            </strong>
            <span>
              {state === "loading"
                ? "Player-made puzzles, bought with G$."
                : state === "error"
                  ? "Your pond is ready to play."
                  : market && market.count > 0
                    ? "Browse the collection for more adventures."
                    : "Create a three-puzzle adventure to share."}
            </span>
          </div>
          <button
            type="button"
            aria-label={state === "error" ? "Retry featured trails" : "Explore the trail market"}
            onClick={state === "error" ? () => setRetry((n) => n + 1) : onBrowse}
          >
            {state === "error" ? "Retry" : <Icon name="chevron" size={18} />}
          </button>
        </div>
      )}
    </section>
  );
}
