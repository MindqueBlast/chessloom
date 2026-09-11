import { describe, expect, it } from "vitest";

import {
  getStarterOpening,
  isStarterOpeningId,
  STARTER_OPENINGS,
} from "./starter-catalog";

describe("starter-catalog", () => {
  it("includes beginner and club openings with public Lichess URLs", () => {
    expect(STARTER_OPENINGS.length).toBeGreaterThanOrEqual(6);
    expect(STARTER_OPENINGS.some((o) => o.level === "beginner")).toBe(true);
    expect(STARTER_OPENINGS.some((o) => o.level === "club")).toBe(true);

    for (const opening of STARTER_OPENINGS) {
      expect(opening.id.length).toBeGreaterThan(0);
      expect(opening.lichessStudyUrl).toMatch(
        /^https:\/\/lichess\.org\/study\/[A-Za-z0-9]+$/,
      );
    }
  });

  it("looks up openings by id", () => {
    const italian = getStarterOpening("italian-beginner");
    expect(italian?.title).toMatch(/Italian/i);
    expect(isStarterOpeningId("italian-beginner")).toBe(true);
    expect(isStarterOpeningId("not-a-real-id")).toBe(false);
  });
});
