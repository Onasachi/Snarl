import { formatCountdown } from "~/game/daily";
import { Icon } from "~/render/Icon";
import { type ClaimCardState, type ClaimStatus, formatAmount } from "~/wallet";

export interface HomeClaim {
  state: ClaimCardState;
  status: ClaimStatus | null;
  busy: boolean;
  onAction: () => void;
}

/** G$ belongs beside the things it buys; this never gates a rescue. */
export function GoodDollar({ claim, onTrails }: { claim: HomeClaim; onTrails: () => void }) {
  const { state, status, busy } = claim;
  const copy = {
    disconnected: {
      title: "Daily G$. More adventures.",
      detail: "Connect, verify, then claim daily G$ for trails.",
      action: "Get started",
    },
    unverified: {
      title: "Your daily G$ starts here.",
      detail: "Verify with GoodDollar to start claiming.",
      action: "Verify",
    },
    expired: {
      title: "A quick check, then you're back.",
      detail: "GoodDollar needs to verify you again.",
      action: "Verify again",
    },
    checking: {
      title: busy ? "Checking your daily G$…" : "Let's check your daily G$.",
      detail: busy ? "Your wallet is catching up." : "Your claim status is unavailable. Try again.",
      action: "Retry",
    },
    ready: {
      title: status
        ? `${formatAmount(status.entitlement, status.decimals)} is ready.`
        : "Your G$ is ready.",
      detail: "Your daily basic income. Put it toward a trail.",
      action: "Claim G$",
    },
    claimed: {
      title: "Today's G$ collected.",
      detail: status?.nextClaimAt
        ? `Next claim in ${formatCountdown(status.nextClaimAt.getTime() - Date.now())}. Find a trail meanwhile.`
        : "Find a new trail. Come back tomorrow for more.",
      action: "Find a trail",
    },
  }[state];
  return (
    <section className="sn-home-good" aria-labelledby="home-good-title">
      <div className="sn-home-good-top">
        <span className="sn-home-good-brand">
          <span aria-hidden="true">G$</span> GoodDollar
        </span>
        <span className="sn-home-good-balance tnum">
          {status
            ? `${formatAmount(status.balance, status.decimals)} in wallet`
            : "Daily basic income"}
        </span>
      </div>
      <div className="sn-home-good-body">
        <div>
          <h2 id="home-good-title">{copy.title}</h2>
          <p>{copy.detail}</p>
        </div>
        <button
          className="sn-home-good-action"
          type="button"
          disabled={busy}
          onClick={state === "claimed" ? onTrails : claim.onAction}
        >
          {busy ? "Please wait…" : copy.action}
          {!busy && <Icon name={state === "claimed" ? "check" : "chevron"} size={14} />}
        </button>
      </div>
    </section>
  );
}
