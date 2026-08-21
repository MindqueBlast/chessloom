import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = join(process.cwd());

describe("training analysis isolation", () => {
  it("AnalysisPanel does not import training actions", () => {
    const source = readFileSync(
      join(webRoot, "components/engine/AnalysisPanel.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/lib\/actions\/training/);
    expect(source).not.toMatch(/submit(Learn|Practice|Test)/);
  });

  it("useEngineAnalysis does not import training actions", () => {
    const source = readFileSync(
      join(webRoot, "hooks/useEngineAnalysis.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/lib\/actions\/training/);
  });

  it("training views mount LazyAnalysisPanel with displayFen", () => {
    for (const view of ["LearnView", "PracticeView", "TestView"]) {
      const source = readFileSync(
        join(webRoot, `components/training/${view}.tsx`),
        "utf8",
      );
      expect(source).toContain("LazyAnalysisPanel");
      expect(source).toMatch(/<LazyAnalysisPanel fen=\{displayFen\}/);
    }
  });
});
