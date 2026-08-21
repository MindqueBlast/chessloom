import { describe, expect, it } from "vitest";
import { parseLichessStudyUrl } from "./url.js";

describe("parseLichessStudyUrl", () => {
  it("extracts study id from common public URLs", () => {
    expect(parseLichessStudyUrl("https://lichess.org/study/abcDef12").studyId).toBe(
      "abcDef12",
    );
    expect(
      parseLichessStudyUrl("https://lichess.org/study/abcDef12/italian-game").studyId,
    ).toBe("abcDef12");
    expect(parseLichessStudyUrl("https://www.lichess.org/study/abcDef12/").canonicalUrl).toBe(
      "https://lichess.org/study/abcDef12",
    );
  });

  it("rejects non-study URLs", () => {
    expect(() => parseLichessStudyUrl("https://lichess.org/practice")).toThrow(/lichess/i);
    expect(() => parseLichessStudyUrl("not-a-url")).toThrow(/lichess/i);
  });
});
