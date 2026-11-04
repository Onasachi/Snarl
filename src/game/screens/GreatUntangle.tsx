import { useMemo, useState } from "react";
import { creatureColor } from "~/data";
import { crossings, scramble } from "~/engine";
import { G$_PER_NUDGE, nudgesForPot, POT_MINIMUM_G$ } from "~/game/progress";
import { useGame } from "~/game/store";
import { endsLabel, WEEKLY_CREATURE, weeklySeed } from "~/game/weekly";
import { CreatureSvg } from "~/render/CreatureSvg";
import { useThemeId } from "~/theme/ThemeProvider";
import type { WeekStatus } from "~/wallet";
import { formatAmount } from "~/wallet";

/**
 * Screen 15: the week's knot. Everyone gets the same tangle until Sunday, and inside it is
 * Glint, who is only ever found this way.
 *
 * What it pays is a creature, not money — PLAN.md has the reasoning. A prize made of the
 * game's own currency needs no treasury and no contract, and cannot be farmed for
 * anything, which is also what makes the shared total safe to add later.
 */
export interface WeeklyChain {
  status: WeekStatus | null;
  busy: boolean;
  /** False until the player has actually freed this week's knot here. */
  freedHere: boolean;
  onEnter: () => void;
  onCollect: () => void;
  /** G$ the player has to put in, and what happens when they do. */
  balance: bigint;
  canBack: boolean;
  onBack: (g$: number) => void;
}

export function GreatUntangle({
  week,
  onAddSolve,
  onBack,
  chain,
}: {
  week: string;
  onAddSolve: () => void;
  onBack: () => void;
  /** The pool, when a wallet is connected and a contract is deployed. */
  chain: WeeklyChain;
}) {
  const themeId = useThemeId();
  const solves = useGame((s) => s.weeklySolves);
  const storedWeek = useGame((s) => s.weeklyWeek);
  const earnedWeek = useGame((s) => s.weeklyEarnedWeek);
  const mine = storedWeek === week ? solves : 0;
  const earned = earnedWeek === week;

  const { art, startingCrossings } = useMemo(() => {
    const pos = scramble(WEEKLY_CREATURE, weeklySeed(week), 10);
    return {
      art: pos,
      startingCrossings: pos ? crossings(pos, WEEKLY_CREATURE.edges).length : 0,
    };
  }, [week]);

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 4px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            minHeight: 44,
            padding: "0 14px",
            border: "1px solid var(--card-line)",
            borderRadius: 999,
            background: "transparent",
            color: "var(--ink2)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Pond
        </button>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink2)",
          }}
        >
          {endsLabel()}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "grid",
          // Centred while it fits and from the top when it does not, rather than
          // centring content taller than the screen and cutting the top off it.
          alignContent: "safe center",
          gap: 6,
          padding: "0 24px",
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink2)",
            margin: 0,
          }}
        >
          This week's community knot
        </p>
        <h2 style={{ fontSize: 30, fontWeight: 600, margin: "0 0 10px" }}>The Great Untangle</h2>

        <div style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: 280, justifySelf: "center" }}>
          {earned && (
            <CreatureSvg creature={WEEKLY_CREATURE} state="free" eyes="open" r={4} sw={1.6} />
          )}
          {!earned && art && (
            <CreatureSvg
              creature={WEEKLY_CREATURE}
              pos={art}
              state="tangled"
              crossings={crossings(art, WEEKLY_CREATURE.edges)}
              eyes="shut"
              r={2.6}
              sw={0.9}
              still
            />
          )}
        </div>

        <dl
          style={{ display: "flex", justifyContent: "space-between", gap: 16, margin: "14px 0 0" }}
        >
          <div>
            <dt
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Your passes
            </dt>
            <dd className="tnum" style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              {mine}
            </dd>
          </div>
          <div style={{ textAlign: "right" }}>
            <dt
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              {earned ? "Freed" : "Crossings"}
            </dt>
            <dd
              className="tnum"
              style={{
                fontSize: 30,
                fontWeight: 600,
                margin: 0,
                color: earned ? creatureColor(WEEKLY_CREATURE, themeId) : "var(--ink)",
              }}
            >
              {earned ? WEEKLY_CREATURE.name : startingCrossings}
            </dd>
          </div>
        </dl>

        {chain.status && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--card-line)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Pool
            </span>
            <span className="tnum" style={{ fontSize: 17, fontWeight: 500 }}>
              {formatAmount(chain.status.pool, chain.status.decimals)}
            </span>
            <span className="tnum" style={{ fontSize: 13, color: "var(--ink2)" }}>
              {chain.status.entrants.toLocaleString()} in
            </span>
          </div>
        )}

        <Pot chain={chain} />

        <p style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink2)", margin: "12px 0 0" }}>
          {earned
            ? `${WEEKLY_CREATURE.name} is in your pond. Another one is tangled up in next week's knot.`
            : `Everyone gets this same knot until Sunday. Free it once and ${WEEKLY_CREATURE.name} is yours to keep.`}
        </p>
      </main>

      <footer
        data-bottom-stack
        style={{
          position: "relative",
          padding: "12px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={onAddSolve}
            style={{
              width: "100%",
              minHeight: 52,
              border: "none",
              borderRadius: 16,
              background: "var(--ink)",
              color: "var(--bg)",
              fontSize: 18,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {earned ? "Untangle it again" : "Untangle it"}
          </button>

          <PoolAction chain={chain} />
        </div>
      </footer>
    </>
  );
}

/**
 * The pool, if there is one. Nothing is shown when no contract is deployed or no wallet
 * is open: the week's creature is the prize either way, and a button that cannot work is
 * worse than no button.
 */
function PoolAction({ chain }: { chain: WeeklyChain }) {
  const { status, busy, freedHere, onEnter, onCollect } = chain;
  if (!status) return null;

  const label = (() => {
    if (status.collected) return "Share collected";
    if (status.settled && status.entered)
      return `Collect ${formatAmount(status.share, status.decimals)}`;
    if (status.entered) return "You are in. Shares are split on Sunday.";
    if (!freedHere) return "Free the knot to enter the pool";
    return "Enter the pool";
  })();

  const enabled =
    !busy &&
    ((status.settled && status.entered && !status.collected) || (!status.entered && freedHere));

  return (
    <button
      type="button"
      onClick={status.entered ? onCollect : onEnter}
      disabled={!enabled}
      style={{
        width: "100%",
        minHeight: 48,
        border: "1px solid var(--card-line)",
        borderRadius: 16,
        background: "transparent",
        color: enabled ? "var(--ink)" : "var(--ink2)",
        fontSize: 16,
        fontWeight: 500,
        cursor: enabled ? "pointer" : "default",
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}

/**
 * Backing the week.
 *
 * The pool is G$ the players put in, not a sponsor's grant, and what a backer gets is
 * nudges — so the money that makes the week worth winning comes from the people who would
 * rather be told where the knot is. The free three a day are untouched; this buys extras,
 * and those do not expire.
 *
 * The minimum is four days of GoodDollar's UBI, which is not greed: the transaction costs
 * the same fee whatever it carries, and below that the fee is most of what is spent.
 */
function Pot({ chain }: { chain: WeeklyChain }) {
  const [amount, setAmount] = useState("");
  const { status, busy, balance, canBack, onBack } = chain;
  const decimals = status?.decimals ?? 18;
  const typed = Number(amount);
  const nudges = Number.isFinite(typed) ? nudgesForPot(typed) : 0;
  const affordable =
    Number.isFinite(typed) &&
    BigInt(Math.round(typed * 100)) * 10n ** BigInt(decimals - 2) <= balance;

  if (!status || !canBack) return null;

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 14 }}>
      <label style={{ display: "flex", gap: 8 }}>
        <span className="sr-only">G$ to put in the pot</span>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder={`${POT_MINIMUM_G$} G$ or more`}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            padding: "0 14px",
            border: "1px solid var(--card-line)",
            borderRadius: 14,
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "inherit",
            fontSize: 16,
          }}
        />
        <button
          type="button"
          onClick={() => onBack(typed)}
          disabled={busy || nudges === 0 || !affordable}
          style={{
            minHeight: 44,
            padding: "0 18px",
            border: "1px solid var(--card-line)",
            borderRadius: 14,
            background: "transparent",
            color: nudges > 0 && affordable && !busy ? "var(--ink)" : "var(--ink2)",
            fontSize: 15,
            fontWeight: 500,
            cursor: nudges > 0 && affordable && !busy ? "pointer" : "default",
          }}
        >
          Put in
        </button>
      </label>
      <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink2)" }}>
        {amount && !affordable
          ? `More than the ${formatAmount(balance, decimals)} you have.`
          : nudges > 0
            ? `${nudges} ${nudges === 1 ? "nudge" : "nudges"}, yours to keep, and the rest of the pool is everyone's on Sunday.`
            : `The pool is whatever players put in. ${POT_MINIMUM_G$} G$ or more earns a nudge per ${G$_PER_NUDGE}; the free three a day never change.`}
      </span>
    </div>
  );
}
