import { describe, expect, it } from "vitest";

import {
  PRACTICE_INCORRECT_COPY,
  boardAnimationOptions,
  shortcutForKey,
  toUci,
} from "./ui";

describe("training UI helpers", () => {
  it("converts a piece drop to UCI and promotes to a queen on the back rank", () => {
    expect(toUci("e2", "e4", "wP")).toBe("e2e4");
    expect(toUci("a7", "a8", "wP")).toBe("a7a8q");
    expect(toUci("h2", "h1", "bP")).toBe("h2h1q");
  });

  it("maps supported keyboard shortcuts and ignores repeated keydown events", () => {
    expect(shortcutForKey("ArrowLeft", false)).toBe("back");
    expect(shortcutForKey("ArrowRight", false)).toBe("forward");
    expect(shortcutForKey("r", false)).toBe("retry");
    expect(shortcutForKey(" ", false)).toBe("advance");
    expect(shortcutForKey("Enter", false)).toBe("advance");
    expect(shortcutForKey("Enter", true)).toBeNull();
    expect(shortcutForKey("Escape", false)).toBeNull();
  });

  it("keeps the practice incorrect feedback copy exact", () => {
    expect(PRACTICE_INCORRECT_COPY).toBe("Not in your repertoire.");
  });

  it("disables board motion when reduced motion is requested", () => {
    expect(boardAnimationOptions(false)).toEqual({
      animationDurationInMs: 140,
      showAnimations: true,
    });
    expect(boardAnimationOptions(true)).toEqual({
      animationDurationInMs: 0,
      showAnimations: false,
    });
  });
});
