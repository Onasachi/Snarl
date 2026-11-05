import { type ReactNode, useMemo, useState } from "react";
import { nameIsValid } from "~/chain/snarlNames";
import { MOON_PHASES, moonLabel } from "~/game/progress";
import { useGame } from "~/game/store";
import { Icon } from "~/render/Icon";
import type { ClaimStatus, Standing, WalletAccount } from "~/wallet";
import { formatAmount } from "~/wallet";

/**
 * You.
 *
 * The game asks for a login before it will start, so there has to be somewhere that
 * answers "who am I here, and what have I done?" without hunting. Everything on this
 * screen was already true and scattered: the address was in a settings sheet, the name
 * was on the leaderboard, the creatures were in the pond and counted nowhere.
 *
 * What is on chain and what is not are kept apart deliberately. The pond is yours whether
 * or not you ever tell a contract about it; the record is what you chose to put up.
 */
export interface ProfileProps {
  account: WalletAccount;
  status: ClaimStatus | null;
  statusError: boolean;
  onRefresh: () => void;
  standing: Standing | null;
  busy: boolean;
  onBack: () => void;
  onCopy: () => void;
  onSignOut: () => void;
  onBoard: () => void;
  onSettings: () => void;
  onClaimName: (name: string) => Promise<boolean>;
  onToast: (message: string) => void;
  toast?: ReactNode;
}

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function ProfileScreen({
  account,
  status,
  statusError,
  onRefresh,
  standing,
  busy,
  onBack,
  onCopy,
  onSignOut,
  onBoard,
  onSettings,
  onClaimName,
  onToast,
  toast,
}: ProfileProps) {
  const freed = useGame((s) => s.freed);
  const moon = useGame((s) => s.moon);
  const [wanted, setWanted] = useState("");

  const kinds = useMemo(() => new Set(freed.map((entry) => entry.id)).size, [freed]);
  const mine = standing?.mine ?? null;
  const name = mine?.name ?? "";

  const claim = async () => {
    const wants = wanted.trim().toLowerCase();
    if (!nameIsValid(wants)) {
      onToast("Three to twenty letters, numbers or underscores.");
      return;
    }
    if (await onClaimName(wants)) {
      setWanted("");
      onToast(`You are ${wants}.`);
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
          <Icon name="pond" size={16} />
          Pond
        </button>
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>You</h2>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "10px 20px 24px", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "1px solid var(--card-line)",
              color: "var(--ink2)",
            }}
          >
            <Icon name="person" size={28} />
          </span>
          <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 600 }}>{name || short(account.address)}</span>
            <button
              type="button"
              onClick={onCopy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--ink2)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Icon name="copy" size={14} />
              {name ? short(account.address) : "Copy address"}
            </button>
          </span>
        </div>

        <section aria-label="Wallet address" style={{ marginBottom: 18 }}>
          <span style={label}>Wallet address · Celo</span>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
              userSelect: "all",
              margin: "5px 0 0",
            }}
          >
            {account.address}
          </p>
        </section>

        <section className="sn-notice" aria-label="Wallet connection status">
          <strong>
            {account.onCelo ? "Connected on Celo" : "Switch your wallet to Celo before signing"}
          </strong>
          <p>
            {statusError
              ? "Could not refresh GoodDollar verification. This is a connection error, not an unverified wallet."
              : !status
                ? "Checking GoodDollar verification…"
                : status.verified
                  ? "GoodDollar recognises this wallet as verified."
                  : status.everVerified
                    ? "GoodDollar verification has expired. Re-verify to publish or claim."
                    : "This wallet is not currently verified in this GoodDollar registry."}
          </p>
          {status?.identityRoot && (
            <p style={{ overflowWrap: "anywhere" }}>Identity root: {status.identityRoot}</p>
          )}
          {status?.identityRegistry && (
            <a
              className="sn-link"
              href={`https://celoscan.io/address/${status.identityRegistry}`}
              target="_blank"
              rel="noreferrer"
            >
              {status.environment} identity registry ↗
            </a>
          )}
          <button type="button" className="sn-link" disabled={busy} onClick={onRefresh}>
            Refresh verification & balance
          </button>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Stat
            label="Creatures"
            value={String(freed.length)}
            note={`${kinds} ${kinds === 1 ? "kind" : "kinds"}`}
          />
          <Stat label="Streak moon" value={`${moon}/${MOON_PHASES}`} note={moonLabel(moon)} />
          <Stat
            label="G$"
            value={status ? formatAmount(status.balance, status.decimals) : "—"}
            note={
              !status
                ? "status unavailable"
                : status.verified
                  ? "verified"
                  : status.everVerified
                    ? "needs a look"
                    : "not verified"
            }
          />
          <Stat
            label="On the board"
            value={mine ? String(mine.untangles) : "0"}
            note={
              mine
                ? `${mine.distinct} ${mine.distinct === 1 ? "creature" : "creatures"}`
                : "nothing put up"
            }
          />
        </div>

        {mine && mine.weeks > 0 && (
          <p style={{ fontSize: 13, color: "var(--ink2)", margin: "12px 0 0" }}>
            {mine.weeks} {mine.weeks === 1 ? "week" : "weeks"} of the Great Untangle
            {mine.streak > 1 ? `, ${mine.streak} of them running` : ""}.
          </p>
        )}

        {standing && !name && (
          <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
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
                  minHeight: 46,
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
                  minHeight: 46,
                  borderRadius: 14,
                  color: nameIsValid(wanted) ? "var(--ink)" : "var(--ink2)",
                }}
              >
                Claim
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 2, marginTop: 22 }}>
          <Row icon="board" label="The Board" onClick={onBoard} />
          <Row icon="settings" label="Settings" onClick={onSettings} />
          <Row icon="leave" label="Sign out" onClick={onSignOut} muted />
        </div>
      </main>
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>{toast}</div>
    </>
  );
}

function Stat({ label: text, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ padding: "12px 14px", border: "1px solid var(--card-line)", borderRadius: 16 }}>
      <span style={label}>{text}</span>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 600, margin: "2px 0 0" }}>
        {value}
      </div>
      {note && <span style={{ fontSize: 12, color: "var(--ink2)" }}>{note}</span>}
    </div>
  );
}

function Row({
  icon,
  label: text,
  onClick,
  muted = false,
}: {
  icon: "board" | "settings" | "leave";
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        minHeight: 54,
        padding: "0 4px",
        border: "none",
        background: "transparent",
        color: muted ? "var(--ink2)" : "var(--ink)",
        fontSize: 17,
        cursor: "pointer",
      }}
    >
      <Icon name={icon} />
      <span style={{ flex: 1, textAlign: "left" }}>{text}</span>
      <Icon name="chevron" size={16} style={{ color: "var(--ink2)" }} />
    </button>
  );
}

const label = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink2)",
} as const;

const pill = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minHeight: 44,
  padding: "0 14px",
  border: "1px solid var(--card-line)",
  borderRadius: 999,
  background: "transparent",
  color: "var(--ink2)",
  fontSize: 14,
  cursor: "pointer",
} as const;
