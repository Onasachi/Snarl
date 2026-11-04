import { useMemo, useState } from "react";
import { chainIdOf, isOnBoard } from "~/chain/roster";
import { nameIsValid } from "~/chain/snarlNames";
import { creatureById } from "~/data";
import { useGame } from "~/game/store";
import type { BoardRow, Standing } from "~/wallet";

/**
 * The board: who has freed what, kept by the contract rather than by us.
 *
 * Two columns, and they measure different things. `Untangles` counts proofs, and a proof
 * costs a transaction — every creature's true shape is in snarl's repository, so a script
 * can file them as fast as it can pay. `Creatures` is bounded by the roster, counts each
 * one once, and a full set is a full set whoever drew it. The screen says so rather than
 * letting anyone assume the first column means something it does not.
 */
export interface BoardProps {
  standing: Standing | null;
  connected: boolean;
  busy: boolean;
  onBack: () => void;
  onConnect: () => void;
  onClaimName: (name: string) => Promise<boolean>;
  onProve: (creature: string) => void;
  onToast: (message: string) => void;
}

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function BoardScreen({
  standing,
  connected,
  busy,
  onBack,
  onConnect,
  onClaimName,
  onProve,
  onToast,
}: BoardProps) {
  const freed = useGame((s) => s.freed);
  const proofs = useGame((s) => s.proofs);
  const [wanted, setWanted] = useState("");

  const mine = standing?.mine ?? null;

  /**
   * Creatures this player has actually freed here and could still put up. Only their own
   * drawings are offered: the contract would take the creature's true shape out of the
   * repository just as happily, which is exactly why the game should not hand it over.
   */
  const puttable = useMemo(() => {
    const seen = new Set<string>();
    const list = [];
    for (const entry of freed) {
      if (seen.has(entry.id) || !proofs[entry.id] || chainIdOf(entry.id) === undefined) continue;
      if (mine && isOnBoard(mine.freed, entry.id)) continue;
      seen.add(entry.id);
      const creature = creatureById(entry.id);
      if (creature) list.push(creature);
    }
    return list;
  }, [freed, proofs, mine]);

  const claim = async () => {
    const name = wanted.trim().toLowerCase();
    if (!nameIsValid(name)) {
      onToast("Three to twenty letters, numbers or underscores.");
      return;
    }
    if (await onClaimName(name)) {
      setWanted("");
      onToast(`You are ${name}.`);
    }
  };

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
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>The Board</h2>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px", minHeight: 0 }}>
        {!standing && (
          <p style={{ fontSize: 15, color: "var(--ink2)", textAlign: "center", marginTop: 40 }}>
            No board yet. Everything you free still counts in your pond.
          </p>
        )}

        {standing && (
          <>
            {connected && !mine?.name && (
              <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
                <span style={label}>Take a name</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={wanted}
                    onChange={(event) =>
                      setWanted(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    maxLength={20}
                    placeholder="three to twenty characters"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 48,
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
                    onClick={() => void claim()}
                    disabled={busy || !nameIsValid(wanted)}
                    style={{
                      ...pill,
                      minHeight: 48,
                      padding: "0 18px",
                      borderRadius: 14,
                      color: nameIsValid(wanted) ? "var(--ink)" : "var(--ink2)",
                    }}
                  >
                    Claim
                  </button>
                </div>
              </div>
            )}

            {!connected && (
              <button
                type="button"
                onClick={onConnect}
                style={{ ...pill, width: "100%", minHeight: 48, marginBottom: 18 }}
              >
                Open a wallet to join the board
              </button>
            )}

            {puttable.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
                <span style={label}>Yours to put up</span>
                {puttable.map((creature) => (
                  <div key={creature.id} style={row}>
                    <span style={{ fontSize: 15 }}>{creature.name}</span>
                    <button
                      type="button"
                      onClick={() => onProve(creature.id)}
                      disabled={busy || !connected}
                      style={{
                        ...pill,
                        minHeight: 36,
                        padding: "0 12px",
                        fontSize: 13,
                        color: connected && !busy ? "var(--ink)" : "var(--ink2)",
                        cursor: connected && !busy ? "pointer" : "default",
                      }}
                    >
                      Put on the board
                    </button>
                  </div>
                ))}
                <span style={{ fontSize: 12, color: "var(--ink2)" }}>
                  Sends the drawing you made, not the creature's own shape.
                </span>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2rem 1fr auto auto",
                gap: "0 10px",
                alignItems: "baseline",
              }}
            >
              <span style={label} />
              <span style={label}>Who</span>
              <span style={{ ...label, textAlign: "right" }}>Untangles</span>
              <span style={{ ...label, textAlign: "right" }}>Creatures</span>

              {standing.rows.map((entry, index) => (
                <Row
                  key={entry.root}
                  entry={entry}
                  rank={index + 1}
                  isMine={entry.root === standing.root}
                />
              ))}
            </div>

            {standing.rows.length === 0 && (
              <p style={{ fontSize: 15, color: "var(--ink2)", textAlign: "center", marginTop: 30 }}>
                Nobody has put anything up yet. Be first.
              </p>
            )}

            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)", margin: "22px 0 0" }}>
              Untangles counts proofs, and a proof costs a transaction — every creature's shape is
              public, so that column rewards spending as much as solving. Creatures counts each one
              once and stops at the roster, which is the column worth racing.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Row({ entry, rank, isMine }: { entry: BoardRow; rank: number; isMine: boolean }) {
  const colour = isMine ? "var(--ink)" : "var(--ink2)";
  return (
    <>
      <span className="tnum" style={{ fontSize: 13, color: "var(--ink2)", paddingTop: 10 }}>
        {rank}
      </span>
      <span style={{ display: "grid", paddingTop: 10, minWidth: 0 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: isMine ? 600 : 400,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.name || short(entry.root)}
        </span>
        {entry.streak > 1 && (
          <span className="tnum" style={{ fontSize: 12, color: colour, whiteSpace: "nowrap" }}>
            {entry.streak} weeks running
          </span>
        )}
      </span>
      <span className="tnum" style={{ fontSize: 15, textAlign: "right", paddingTop: 10 }}>
        {entry.untangles}
      </span>
      <span
        className="tnum"
        style={{ fontSize: 15, textAlign: "right", paddingTop: 10, color: colour }}
      >
        {entry.distinct}
      </span>
    </>
  );
}

const label = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink2)",
} as const;

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

const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 14px",
  border: "1px solid var(--card-line)",
  borderRadius: 14,
} as const;
