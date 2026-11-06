import { type CSSProperties, useRef, useState } from "react";
import type { Pt } from "~/engine";
import type { Address, RescueOptions, RescueReceipt, WalletAccount } from "~/wallet/port";
import type { WalletError } from "~/wallet/useWallet";

export interface RescueControls {
  account: WalletAccount | null;
  busy: boolean;
  error: WalletError | null;
  demo: boolean;
  recorded: boolean;
  onConnect: () => void;
  onRecord: (
    moves: number,
    pos: readonly Pt[],
    stats: SolveStats,
    options: RescueOptions,
  ) => Promise<RescueReceipt | null>;
}
export interface SolveStats {
  initialCrossings: number;
  assisted: boolean;
}

const primary: CSSProperties = {
  width: "100%",
  minHeight: 52,
  border: "none",
  borderRadius: 16,
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontSize: 17,
  fontWeight: 500,
};

export function RescueActions({
  controls: c,
  moves,
  solution,
  stats,
  nextLabel,
  onContinue,
  onPond,
}: {
  controls: RescueControls;
  moves: number;
  solution: readonly Pt[];
  stats: SolveStats;
  nextLabel: string;
  onContinue: () => void;
  onPond?: (() => void) | undefined;
}) {
  const [phase, setPhase] = useState<"idle" | "signing" | "confirming" | "failed" | "done">("idle");
  const [receipt, setReceipt] = useState<RescueReceipt | null>(null);
  const [hash, setHash] = useState<Address | null>(null);
  const active = useRef(false);
  const waiting = phase === "signing" || phase === "confirming";
  const done = phase === "done" || (c.recorded && !waiting && !hash);
  const disabled = c.busy || waiting;
  const submit = async () => {
    if (active.current || disabled) return;
    if (!c.account?.onCelo) {
      c.onConnect();
      return;
    }
    active.current = true;
    setPhase("signing");
    try {
      const result = await c.onRecord(moves, solution, stats, {
        onSubmitted: (submitted) => {
          setHash(submitted);
          setPhase("confirming");
        },
      });
      setReceipt(result);
      if (result?.kind === "confirmed") setHash(result.hash);
      setPhase(result ? "done" : "failed");
    } catch {
      setPhase("failed");
    } finally {
      active.current = false;
    }
  };
  const label = done
    ? nextLabel
    : phase === "confirming"
      ? "Confirming on Celo…"
      : phase === "signing"
        ? c.demo
          ? "Simulating…"
          : "Check your wallet…"
        : c.busy
          ? "Opening wallet…"
          : !c.account
            ? "Connect to record rescue"
            : !c.account.onCelo
              ? "Reconnect on Celo"
              : phase === "failed" && hash && c.error !== "reverted" && c.error !== "rejected"
                ? "Check transaction"
                : c.demo
                  ? "Simulate rescue record"
                  : "Record rescue on Celo";
  const message = done
    ? c.demo || receipt?.kind === "demo"
      ? "Demo rescue saved. No transaction was sent."
      : receipt?.kind === "already-recorded" || !receipt
        ? "Already recorded on your Celo board."
        : "Rescue recorded on Celo. Your board is growing."
    : phase === "failed"
      ? c.error === "insufficient-gas"
        ? "Your wallet needs CELO for the network fee. Your rescue is still yours."
        : c.error === "rejected"
          ? "Transaction cancelled. Try again when you're ready."
          : c.error === "reverted"
            ? "The transaction reverted. This rescue has not been recorded."
            : hash
              ? "Confirmation is taking longer. Check this transaction before continuing."
              : "We couldn't record this rescue. You can retry or keep playing."
      : c.demo
        ? "Demo mode · no real funds or transactions."
        : "Save your score to the community board on Celo. A network fee applies; no G$ is spent.";
  return (
    <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
      <p
        role="status"
        style={{ fontSize: 13, lineHeight: 1.4, margin: "0 0 4px", color: "var(--ink2)" }}
      >
        {message}
      </p>
      {hash && (
        <a
          className="sn-link"
          href={`https://celoscan.io/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction ↗
        </a>
      )}
      <button
        type="button"
        style={{
          ...primary,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? "default" : "pointer",
        }}
        disabled={disabled}
        onClick={done ? onContinue : () => void submit()}
      >
        {label}
      </button>
      {!done && (
        <button type="button" className="sn-link" disabled={waiting} onClick={onContinue}>
          Keep playing · record later
        </button>
      )}
      {done && onPond && (
        <button type="button" className="sn-link" onClick={onPond}>
          Visit the pond
        </button>
      )}
    </div>
  );
}
