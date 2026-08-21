import { describe, expect, it } from "vitest";

import {
  normalizeLearnAutoContinue,
  normalizePalettePreference,
  normalizeSoundEnabled,
} from "./preferences";

describe("settings preferences", () => {
  it("normalizes palette ids and defaults unknown values to teal", () => {
    expect(normalizePalettePreference("ocean")).toBe("ocean");
    expect(normalizePalettePreference("nope")).toBe("teal");
  });

  it("normalizes sound and learn auto-continue flags", () => {
    expect(normalizeSoundEnabled("true")).toBe(true);
    expect(normalizeSoundEnabled(null)).toBe(false);
    expect(normalizeLearnAutoContinue(1)).toBe(true);
    expect(normalizeLearnAutoContinue("0")).toBe(false);
  });
});
