import { useEffect, useState } from "react";
import type { GameRun } from "~/game/results";
import { useGame } from "~/game/store";
import { wantsDemoWallet } from "~/wallet";
import type { GameBoardRow } from "~/wallet/game";
import type { useWallet } from "~/wallet/useWallet";

export function GameBoardScreen({
  wallet,
  onBack,
}: {
  wallet: ReturnType<typeof useWallet>;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<GameBoardRow[]>([]);
  const [mine, setMine] = useState<GameBoardRow | null>(null);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Reading scores from Celo…");
  const [revision, setRevision] = useState(0);
  const runs = useGame((s) => s.gameRuns);
  const [unrecorded, setUnrecorded] = useState<GameRun[]>([]);
  const [lastReceipt, setLastReceipt] = useState<{ account: string; hash: string } | null>(null);
  const [failedAccount, setFailedAccount] = useState<string | null>(null);
  const account = wallet.account?.address;
  const lastHash = lastReceipt && lastReceipt.account === account ? lastReceipt.hash : null;
  const recordError =
    failedAccount === account
      ? wallet.error === "rejected"
        ? "Transaction cancelled. Your rescue is saved and you can try again."
        : wallet.error === "insufficient-gas"
          ? "You need a little CELO for the network fee. Your rescue is saved."
          : "Recording wasn't completed. Your rescue is saved; retry to check or submit it."
      : null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh the same account's saved runs after a receipt.
  useEffect(() => {
    let current = true;
    setUnrecorded([]);
    if (account && wallet.gameSupported)
      void (async () => {
        const available: GameRun[] = [];
        for (const run of Object.values(runs).reverse()) {
          if (!current || available.length >= 5) break;
          if (!(await wallet.hasRecordedRun(run.id))) available.push(run);
        }
        if (current) setUnrecorded(available);
      })().catch(() => {});
    return () => {
      current = false;
    };
  }, [account, wallet.gameSupported, wallet.hasRecordedRun, runs, revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the adapter reads the current account through a ref.
  useEffect(() => {
    let active = true;
    setRows([]);
    setMine(null);
    setMessage("Reading scores from Celo…");
    void (async () => {
      try {
        const first = await wallet.readGameBoard();
        if (!active) return;
        if (!first) {
          setMessage("Community scores will open when the game contract launches.");
          return;
        }
        const all = [...first.rows];
        for (let offset = 100; offset < Math.min(first.count, 10000); offset += 100) {
          const page = await wallet.readGameBoard(offset);
          if (!active) return;
          if (!page) break;
          all.push(...page.rows);
        }
        all.sort((a, b) =>
          a.points === b.points
            ? b.runs - a.runs || a.wallet.localeCompare(b.wallet)
            : a.points > b.points
              ? -1
              : 1,
        );
        setRows(all);
        setCount(first.count);
        setMine(first.mine);
        setMessage(
          all.length ? "" : "The first spot is waiting. Finish a puzzle and record your rescue.",
        );
      } catch {
        if (active) setMessage("Celo scores are unavailable. Try refreshing.");
      }
    })();
    return () => {
      active = false;
    };
  }, [wallet.readGameBoard, account, revision]);
  return (
    <div className="sn-page">
      <header className="sn-page-head">
        <button className="sn-pill" type="button" onClick={onBack}>
          ← Home
        </button>
        <span>Community leaderboard</span>
      </header>
      <main className="sn-page-body">
        <h1 className="sn-adventure-title">
          Make every
          <br />
          crossing count.
        </h1>
        <p className="sn-sub">
          10 points per starting crossing, plus 25 for finishing under par without hints or boosts.
          Each puzzle counts once per wallet.
        </p>
        <p className="sn-notice">
          {wantsDemoWallet()
            ? "Demo scores. No transactions were sent."
            : "Player-reported scores, checked on the player's device. These are recorded on Celo, not independently verified."}
        </p>
        {unrecorded.length > 0 && (
          <section className="sn-story-moment">
            <h3>Your unrecorded rescues</h3>
            <p>
              Save these results to Celo. Each recording requests a transaction and a network fee.
            </p>
            {unrecorded.map((run) => (
              <div className="sn-shop-summary" key={run.id}>
                <span>
                  {run.level ? `Adventure level ${run.level}` : "Challenge rescue"}
                  <small style={{ display: "block" }}>
                    {run.crossings} crossings · {run.moves} moves
                  </small>
                </span>
                <button
                  type="button"
                  className="sn-pill"
                  disabled={wallet.busy}
                  onClick={() => {
                    if (!account) return;
                    setFailedAccount(null);
                    void wallet
                      .recordGameRun(run)
                      .then((receipt) => {
                        if (receipt) {
                          setRevision((n) => n + 1);
                          if (receipt.kind === "confirmed")
                            setLastReceipt({ account, hash: receipt.hash });
                        } else setFailedAccount(account);
                      })
                      .catch(() => setFailedAccount(account));
                  }}
                >
                  {wallet.busy ? "Please wait…" : "Record on Celo"}
                </button>
              </div>
            ))}
          </section>
        )}
        {recordError && (
          <p role="status" className="sn-sub">
            {recordError}
          </p>
        )}
        {lastHash && (
          <a
            className="sn-link"
            href={`https://celoscan.io/tx/${lastHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View recorded rescue ↗
          </a>
        )}
        {mine && mine.runs > 0 && (
          <div className="sn-shop-summary">
            <span>
              Your recorded score
              <strong style={{ display: "block", fontSize: 30 }}>
                {mine.points.toString()} pts
              </strong>
            </span>
            <span>
              {mine.runs} rescues
              <br />
              {mine.crossings.toString()} crossings
            </span>
          </div>
        )}
        {message && (
          <p role="status" className="sn-sub">
            {message}
          </p>
        )}
        {count > rows.length && (
          <p className="sn-sub">
            Ranking the first {rows.length} of {count} participating wallets.
          </p>
        )}
        <ol style={{ listStyle: "none", margin: "20px 0", padding: 0 }}>
          {rows.slice(0, 100).map((row, index) => (
            <li key={row.wallet} className="sn-shop-summary" style={{ gap: 12 }}>
              <strong style={{ color: index < 3 ? "var(--accent)" : "var(--ink2)", fontSize: 24 }}>
                {index + 1}
              </strong>
              <span style={{ flex: 1 }}>
                {row.wallet.toLowerCase() === account?.toLowerCase()
                  ? "You"
                  : `${row.wallet.slice(0, 6)}…${row.wallet.slice(-4)}`}
                <small style={{ display: "block", color: "var(--ink2)" }}>
                  {row.runs} rescues · {row.crossings.toString()} crossings
                </small>
              </span>
              <strong>
                {row.points.toString()}
                <small style={{ display: "block", color: "var(--ink2)", fontWeight: 400 }}>
                  points
                </small>
              </strong>
            </li>
          ))}
        </ol>
        <button className="sn-pill" type="button" onClick={() => setRevision((n) => n + 1)}>
          Refresh scores
        </button>
      </main>
    </div>
  );
}
