import { useMemo, useState } from "react";
import { creatureById } from "~/data";
import type { Creature } from "~/engine";
import { giftLink, makeGiftKey } from "~/game/gift";
import { useGame } from "~/game/store";
import { CreatureSvg } from "~/render/CreatureSvg";
import { formatAmount, formatG$ } from "~/wallet";

/** What the Gift screen needs to know about money, when there is a wallet to ask. */
export interface GiftTips {
  /** False with no wallet connected or no escrow contract: there is then no tip box. */
  enabled: boolean;
  balance: bigint;
  decimals: number;
  busy: boolean;
  /** Puts G$ behind the link. True once it is actually escrowed. */
  onSend: (key: string, amount: bigint) => Promise<boolean>;
  /**
   * Takes back a gift nobody opened. "gone" means somebody already has it, which is the
   * happy ending and the one case where there is nothing left to wait for.
   */
  onReclaim: (key: string) => Promise<"taken" | "gone" | "failed">;
}

/**
 * Screen 14: give one of your creatures to someone. The whole gift rides in the link's
 * fragment, so there is nothing to sign up for at either end and nothing kept anywhere.
 *
 * G$ cannot ride in a fragment the same way, because a link has no address behind it
 * until somebody opens it. So the link carries a one-time key instead and the escrow
 * contract holds the money against it — which means the money goes up *before* the link
 * exists, and the link is then the only way to it.
 */
export function GiftScreen({
  onBack,
  onToast,
  tips,
}: {
  onBack: () => void;
  onToast: (m: string) => void;
  tips: GiftTips;
}) {
  const freed = useGame((s) => s.freed);
  const sentTips = useGame((s) => s.sentTips);
  const recordSentTip = useGame((s) => s.recordSentTip);
  const forgetSentTip = useGame((s) => s.forgetSentTip);
  const [chosen, setChosen] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState<string | null>(null);
  /** What ended up escrowed behind the link on screen, if anything. */
  const [linked, setLinked] = useState<bigint | null>(null);

  // One of each: a pond with four Pips should offer Pip once.
  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: Creature[] = [];
    for (const entry of freed) {
      if (seen.has(entry.id)) continue;
      const creature = creatureById(entry.id);
      if (!creature) continue;
      seen.add(entry.id);
      list.push(creature);
    }
    return list;
  }, [freed]);

  const creature = chosen ? creatureById(chosen) : undefined;

  // The typed amount in the token's smallest unit, or null if it is not a number, not
  // positive, or more than there is.
  const tipAmount = useMemo(() => {
    if (!tips.enabled || !amount.trim()) return null;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return null;
    const units = BigInt(Math.round(value * 100)) * 10n ** BigInt(tips.decimals - 2);
    return units > 0n && units <= tips.balance ? units : null;
  }, [amount, tips.enabled, tips.decimals, tips.balance]);

  const tipTyped = tips.enabled && amount.trim() !== "";

  const make = async () => {
    if (!creature) return;
    setLinked(null);
    const origin = `${window.location.origin}${window.location.pathname}`;

    // Money first. A link that promises G$ before the G$ is escrowed is a link that
    // lies, so if this fails there is no link.
    let key: string | undefined;
    if (tipAmount !== null) {
      const made = makeGiftKey();
      if (!(await tips.onSend(made, tipAmount))) {
        onToast("The G$ did not go through. The link is not made.");
        return;
      }
      key = made;
      setLinked(tipAmount);
      recordSentTip({
        key: made,
        creature: creature.id,
        amount: tipAmount.toString(),
        at: Date.now(),
      });
    }

    setLink(
      giftLink(origin, {
        id: creature.id,
        at: Date.now(),
        ...(from.trim() ? { from: from.trim() } : {}),
        ...(key ? { key } : {}),
      }),
    );
  };

  const takeBack = async (key: string) => {
    const outcome = await tips.onReclaim(key);
    if (outcome === "failed") return;
    forgetSentTip(key);
    onToast(outcome === "gone" ? "Someone already opened that one." : "Taken back.");
  };

  const share = async () => {
    if (!link || !creature) return;
    const text = `I freed ${creature.name} for you.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "snarl", text, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      onToast("Link copied. Send it to anyone.");
    } catch {
      // Cancelled, or no permission. The link is on screen either way.
      onToast("The link is on screen — copy it from there.");
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
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>Gift a Snarl</h2>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "12px 20px", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setChosen(option.id);
                setLink(null);
              }}
              aria-pressed={chosen === option.id}
              style={{
                aspectRatio: "1 / 1",
                padding: 8,
                border: `1px solid ${chosen === option.id ? "var(--ink)" : "var(--card-line)"}`,
                borderRadius: 18,
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              <CreatureSvg creature={option} state="free" eyes="open" r={5} sw={2.2} still />
            </button>
          ))}
        </div>

        {options.length === 0 && (
          <p style={{ fontSize: 17, color: "var(--ink2)", textAlign: "center", marginTop: 40 }}>
            Free a creature first, then you can send one on.
          </p>
        )}

        <label style={{ display: "grid", gap: 6, marginTop: 20 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink2)",
            }}
          >
            From (optional)
          </span>
          <input
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setLink(null);
            }}
            maxLength={24}
            placeholder="Your name"
            style={{
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
        </label>

        {tips.enabled && !link && (
          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              <span>Add G$ (optional)</span>
              <span className="tnum" style={{ textTransform: "none", letterSpacing: 0 }}>
                {formatG$(tips.balance, tips.decimals)} yours
              </span>
            </span>
            <input
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^\d.]/g, ""));
                setLink(null);
              }}
              inputMode="decimal"
              placeholder="0"
              aria-invalid={tipTyped && tipAmount === null}
              style={{
                minHeight: 48,
                padding: "0 14px",
                border: `1px solid ${tipTyped && tipAmount === null ? "var(--warm)" : "var(--card-line)"}`,
                borderRadius: 14,
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "inherit",
                fontSize: 16,
              }}
            />
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>
              {tipTyped && tipAmount === null
                ? "More than you have, or not a number."
                : "It waits in escrow until someone opens the link. Yours again after a month if nobody does."}
            </span>
          </label>
        )}

        {sentTips.length > 0 && !link && (
          <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Waiting to be opened
            </span>
            {sentTips.map((tip) => (
              <div
                key={tip.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  border: "1px solid var(--card-line)",
                  borderRadius: 14,
                }}
              >
                <span style={{ fontSize: 15 }}>
                  {creatureById(tip.creature)?.name ?? "A creature"}
                  <span className="tnum" style={{ color: "var(--ink2)" }}>
                    {" · "}
                    {formatAmount(BigInt(tip.amount), tips.decimals)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void takeBack(tip.key)}
                  disabled={tips.busy}
                  style={{
                    minHeight: 36,
                    padding: "0 12px",
                    border: "1px solid var(--card-line)",
                    borderRadius: 999,
                    background: "transparent",
                    color: "var(--ink2)",
                    fontSize: 13,
                    cursor: tips.busy ? "default" : "pointer",
                  }}
                >
                  Take back
                </button>
              </div>
            ))}
          </div>
        )}

        {link && (
          <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
            <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", margin: 0 }}>
              {linked === null ? (
                <>
                  Anyone who opens this gets {creature?.name} in their pond. The link holds the
                  whole gift, so nothing is stored anywhere.
                </>
              ) : (
                <>
                  Anyone who opens this gets {creature?.name} and the{" "}
                  {formatAmount(linked, tips.decimals)} waiting behind it. The creature is in the
                  link; the money is in a contract, and this link is the only key to it. Lose the
                  link and you can take the money back in a month.
                </>
              )}
            </p>
            <code
              style={{
                display: "block",
                padding: 12,
                border: "1px solid var(--card-line)",
                borderRadius: 14,
                background: "var(--card)",
                color: "var(--ink2)",
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              {link}
            </code>
          </div>
        )}
      </main>

      <footer
        data-bottom-stack
        style={{
          position: "relative",
          padding: "12px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={link ? () => void share() : () => void make()}
          disabled={!creature || tips.busy || (tipTyped && tipAmount === null)}
          style={{
            width: "100%",
            minHeight: 52,
            border: "none",
            borderRadius: 16,
            background: creature ? "var(--ink)" : "var(--card)",
            color: creature ? "var(--bg)" : "var(--ink2)",
            fontSize: 18,
            fontWeight: 500,
            cursor: creature ? "pointer" : "default",
          }}
        >
          {tips.busy
            ? "Putting the gift up…"
            : link
              ? "Send the link"
              : tipAmount !== null
                ? `Make a link with ${formatAmount(tipAmount, tips.decimals)}`
                : "Make a link"}
        </button>
      </footer>
    </>
  );
}
