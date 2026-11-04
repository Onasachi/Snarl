import type { AdminState, AdminWeek } from "~/wallet";
import { formatAmount } from "~/wallet";

/**
 * Keeping the pool running: opening each week and settling the ones that have closed.
 *
 * "Admin only" is a thing this screen cannot provide and does not claim to. There is no
 * server; the page is static and anybody can open it. What actually guards `openKnot` is
 * the contract's own `onlyOwner`, which is the only guard that could ever matter — a
 * hidden button is not a lock. So the screen reads the owner off the chain and shows the
 * controls only to that wallet, which is honesty about who can act rather than security
 * theatre about who can look.
 *
 * The timestamps are never typed. A week number can be opened once and never again, so
 * they come from the generated table that the game's own tests check.
 */
export interface AdminProps {
  state: AdminState | null;
  connected: boolean;
  busy: boolean;
  onBack: () => void;
  onConnect: () => void;
  onOpen: (week: number) => void;
  onSettle: (week: number) => void;
}

export function AdminScreen({
  state,
  connected,
  busy,
  onBack,
  onConnect,
  onOpen,
  onSettle,
}: AdminProps) {
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 4px",
        }}
      >
        <button type="button" onClick={onBack} style={pill}>
          Pond
        </button>
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>Weeks</h2>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px", minHeight: 0 }}>
        {!state && (
          <p style={{ fontSize: 15, color: "var(--ink2)", textAlign: "center", marginTop: 40 }}>
            No pool contract configured, so there are no weeks to keep.
          </p>
        )}

        {state && (
          <>
            <dl style={{ display: "flex", gap: 20, margin: "0 0 18px" }}>
              <div>
                <dt style={label}>Opened</dt>
                <dd className="tnum" style={figure}>
                  {state.weeksOpened}
                </dd>
              </div>
              <div>
                <dt style={label}>Locked</dt>
                <dd className="tnum" style={figure}>
                  {formatAmount(state.locked, state.decimals)}
                </dd>
              </div>
            </dl>

            {!connected && (
              <button
                type="button"
                onClick={onConnect}
                style={{ ...pill, width: "100%", minHeight: 48, marginBottom: 18 }}
              >
                Open the owner's wallet
              </button>
            )}

            {connected && !state.isOwner && (
              <p
                style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", margin: "0 0 18px" }}
              >
                This wallet is not the owner, so opening a week would be refused by the contract.
                The owner is <span style={{ wordBreak: "break-all" }}>{state.owner}</span>.
              </p>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {state.weeks.map((week) => (
                <Week
                  key={week.id}
                  week={week}
                  decimals={state.decimals}
                  canAct={connected && state.isOwner && !busy}
                  busy={busy}
                  onOpen={onOpen}
                  onSettle={onSettle}
                />
              ))}
            </div>

            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)", margin: "20px 0 0" }}>
              A week opens with an empty pool and the players fill it. Its knot and its times come
              from the generated table, never from this screen: a week number can be opened once and
              never again. Settling is open to anyone — it only freezes the share so entrants can
              collect.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Week({
  week,
  decimals,
  canAct,
  busy,
  onOpen,
  onSettle,
}: {
  week: AdminWeek;
  decimals: number;
  canAct: boolean;
  busy: boolean;
  onOpen: (week: number) => void;
  onSettle: (week: number) => void;
}) {
  const action = !week.opened ? "open" : week.settleable ? "settle" : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 14px",
        border: `1px solid ${week.due ? "var(--warm)" : "var(--card-line)"}`,
        borderRadius: 14,
      }}
    >
      <span style={{ display: "grid", minWidth: 0 }}>
        <span style={{ fontSize: 15 }}>
          {week.label}
          <span className="tnum" style={{ fontSize: 12, color: "var(--ink2)" }}>
            {" · "}
            {week.id}
          </span>
        </span>
        <span
          className="tnum"
          style={{ fontSize: 12, color: week.due ? "var(--warm)" : "var(--ink2)" }}
        >
          {week.due
            ? "it is already this week for some players"
            : week.opened
              ? `${formatAmount(week.pool, decimals)} · ${week.entrants} in${week.settled ? " · settled" : ""}`
              : `closes ${week.closesAt.toISOString().slice(0, 10)}`}
        </span>
      </span>

      {action && (
        <button
          type="button"
          onClick={() => (action === "open" ? onOpen(week.id) : onSettle(week.id))}
          disabled={!canAct && action === "open"}
          style={{
            ...pill,
            minHeight: 36,
            padding: "0 12px",
            fontSize: 13,
            color: canAct || action === "settle" ? "var(--ink)" : "var(--ink2)",
            cursor: canAct || action === "settle" ? "pointer" : "default",
          }}
        >
          {busy ? "…" : action === "open" ? "Open" : "Settle"}
        </button>
      )}
    </div>
  );
}

const label = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink2)",
} as const;

const figure = { fontSize: 22, fontWeight: 600, margin: 0 } as const;

const pill = {
  minHeight: 44,
  padding: "0 14px",
  border: "1px solid var(--card-line)",
  borderRadius: 999,
  background: "transparent",
  color: "var(--ink)",
  fontSize: 14,
  cursor: "pointer",
} as const;
