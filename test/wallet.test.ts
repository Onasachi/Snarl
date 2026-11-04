import { describe, expect, it } from "vitest";
import type { ClaimStatus, WalletAccount } from "~/wallet/port";
import { claimCardState, formatAmount, formatG$ } from "~/wallet/port";

const account: WalletAccount = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: 42220,
  label: "MiniPay",
  onCelo: true,
};
const status = (over: Partial<ClaimStatus> = {}): ClaimStatus => ({
  everVerified: true,
  verified: true,
  entitlement: 0n,
  nextClaimAt: null,
  balance: 0n,
  decimals: 18,
  ...over,
});

describe("formatG$", () => {
  it("reads as money on Celo, where G$ has 18 decimals", () => {
    expect(formatG$(152_370_000_000_000_000_000n, 18)).toBe("152.37");
    expect(formatG$(0n, 18)).toBe("0.00");
    expect(formatG$(10n ** 18n, 18)).toBe("1.00");
  });

  // G$ is 2 decimals on Fuse and 18 on Celo. A number that forgets which chain it came
  // from is wrong by a factor of 10^16.
  it("respects the chain's own decimals", () => {
    expect(formatG$(15_237n, 2)).toBe("152.37");
    expect(formatG$(15_237n, 18)).toBe("0.00");
  });

  it("truncates rather than rounding up", () => {
    // 1.999 must never be shown as 2.00: that is money the player does not have.
    expect(formatG$(1_999_000_000_000_000_000n, 18)).toBe("1.99");
    expect(formatG$(999_999_999_999_999_999n, 18)).toBe("0.99");
  });

  it("groups thousands and keeps negatives signed", () => {
    expect(formatG$(1_234_567n * 10n ** 18n, 18)).toBe("1,234,567.00");
    expect(formatG$(-5n * 10n ** 18n, 18)).toBe("-5.00");
  });

  it("labels the token", () => {
    expect(formatAmount(152_370_000_000_000_000_000n, 18)).toBe("152.37 G$");
  });
});

describe("the claim card", () => {
  it("asks for a wallet before anything else", () => {
    expect(claimCardState(null, null)).toBe("disconnected");
    expect(claimCardState(null, status())).toBe("disconnected");
    expect(claimCardState(account, null)).toBe("disconnected");
  });

  it("asks for the face check only once there is a wallet", () => {
    expect(claimCardState(account, status({ verified: false, everVerified: false }))).toBe(
      "unverified",
    );
  });

  it("tells a lapsed verification apart from never having had one", () => {
    // GoodDollar re-verifies on a ladder starting at three days, so this is the ordinary
    // case, not an edge one. "You are not verified" would read as a broken app.
    expect(claimCardState(account, status({ verified: false, everVerified: true }))).toBe(
      "expired",
    );
  });

  it("offers the claim when there is something to claim", () => {
    expect(claimCardState(account, status({ entitlement: 1n }))).toBe("ready");
  });

  it("says done when today's claim is spent", () => {
    expect(claimCardState(account, status({ entitlement: 0n, nextClaimAt: new Date() }))).toBe(
      "claimed",
    );
  });
});
