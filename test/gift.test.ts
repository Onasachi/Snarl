import { describe, expect, it } from "vitest";
import { decodeGift, encodeGift, giftFromHash, giftLink } from "~/game/gift";

const gift = { id: "pip", from: "Ada", at: 1_762_000_000_000 };

describe("gift links", () => {
  it("survives the round trip", () => {
    expect(decodeGift(encodeGift(gift))).toEqual(gift);
  });

  it("carries the gift in the fragment, which never reaches a server", () => {
    const link = giftLink("https://snarl.example/", gift);
    expect(link).toContain("#gift=");
    expect(new URL(link).search).toBe("");
    expect(giftFromHash(new URL(link).hash)).toEqual(gift);
  });

  it("handles names that are not ASCII", () => {
    const decoded = decodeGift(encodeGift({ ...gift, from: "Zoë 🐟" }));
    expect(decoded?.from).toBe("Zoë 🐟");
  });

  it("drops an empty sender rather than carrying an empty string", () => {
    expect(decodeGift(encodeGift({ id: "pip", from: "   ", at: 1 }))?.from).toBeUndefined();
  });

  // The link comes from a stranger by way of a chat app. None of it is trusted.
  it("refuses anything that is not a creature we have", () => {
    expect(decodeGift(encodeGift({ id: "not-a-creature", at: 1 }))).toBeNull();
    expect(decodeGift("not base64 at all!!")).toBeNull();
    expect(decodeGift(btoa('{"id":123}'))).toBeNull();
    expect(decodeGift(btoa("[]"))).toBeNull();
    expect(decodeGift(btoa("null"))).toBeNull();
    expect(giftFromHash("#something-else")).toBeNull();
    expect(giftFromHash("")).toBeNull();
  });

  it("caps a sender's name instead of letting it fill the screen", () => {
    const long = "a".repeat(200);
    expect(decodeGift(encodeGift({ id: "pip", from: long, at: 1 }))?.from).toHaveLength(24);
  });

  it("survives a missing timestamp", () => {
    expect(decodeGift(btoa('{"id":"pip"}'))).toEqual({ id: "pip", at: 0 });
  });
});
