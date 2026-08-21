import { describe, expect, it } from "vitest";
import { buildPathKey } from "./path-key.js";

describe("buildPathKey", () => {
  it("encodes chapter root", () => {
    expect(buildPathKey(0, [])).toBe("c0:");
  });

  it("joins uci path", () => {
    expect(buildPathKey(1, ["e2e4", "e7e5", "g1f3"])).toBe(
      "c1:e2e4/e7e5/g1f3",
    );
  });
});
