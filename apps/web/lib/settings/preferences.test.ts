import { describe, expect, it } from "vitest";

import {
  normalizeDefaultSideMode,
  normalizeThemePreference,
} from "./preferences";

describe("settings preferences", () => {
  it("accepts supported theme and side values", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeDefaultSideMode("white")).toBe("white");
    expect(normalizeDefaultSideMode("black")).toBe("black");
    expect(normalizeDefaultSideMode("both")).toBe("both");
  });

  it("rejects unsupported values", () => {
    expect(() => normalizeThemePreference("sepia")).toThrow("theme");
    expect(() => normalizeDefaultSideMode("random")).toThrow("side");
  });
});
