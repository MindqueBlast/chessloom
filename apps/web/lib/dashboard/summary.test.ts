import { describe, expect, it } from "vitest";

import { buildDashboardSummary, calculateTrainingStreak } from "./summary";

describe("calculateTrainingStreak", () => {
  it("counts consecutive distinct completion days from today", () => {
    const now = new Date("2026-08-20T18:00:00.000Z");

    expect(
      calculateTrainingStreak(
        [
          "2026-08-20T12:00:00.000Z",
          "2026-08-20T08:00:00.000Z",
          "2026-08-19T18:00:00.000Z",
          "2026-08-18T09:00:00.000Z",
          "2026-08-16T09:00:00.000Z",
        ],
        now,
      ),
    ).toBe(3);
  });

  it("keeps yesterday's streak when today has no completed session", () => {
    expect(
      calculateTrainingStreak(
        ["2026-08-19T18:00:00.000Z", "2026-08-18T09:00:00.000Z"],
        new Date("2026-08-20T18:00:00.000Z"),
      ),
    ).toBe(2);
  });
});

describe("buildDashboardSummary", () => {
  it("includes unseen trainable positions as due and weak", () => {
    const summary = buildDashboardSummary(
      [
        {
          id: "study-1",
          title: "Sicilian",
          source_type: "pgn_paste",
          created_at: "2026-08-18T12:00:00.000Z",
        },
      ],
      [{ study_id: "study-1" }],
      [
        { id: "root", parent_id: null, study_id: "study-1", path_key: "c0:" },
        {
          id: "move",
          parent_id: "root",
          study_id: "study-1",
          path_key: "c0:e2e4",
        },
        {
          id: "reply",
          parent_id: "move",
          study_id: "study-1",
          path_key: "c0:e2e4.c7c5",
        },
      ],
      [
        {
          study_id: "study-1",
          path_key: "c0:",
          mastery: 64,
          due_at: "2026-08-20T10:00:00.000Z",
        },
      ],
      new Date("2026-08-20T12:00:00.000Z"),
    );

    expect(summary).toMatchObject({
      dueCount: 2,
      weakPathKeys: ["c0:e2e4"],
      weakPositions: [
        { studyId: "study-1", pathKey: "c0:e2e4", mastery: 0 },
      ],
      studies: [
        {
          chapterCount: 1,
          moveCount: 2,
          mastery: 32,
          dueCount: 2,
          weakCount: 1,
        },
      ],
    });
  });
});
