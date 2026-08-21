import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const samplePgn = `[Event "Italian Game"]

1. e4 e5 2. Nf3 *`;

describe("fetchLichessStudyPgn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches public study PGN and extracts title hint", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://lichess.org/api/study/abcDef12.pgn?clocks=false");
      expect(init?.headers).toEqual({
        Accept: "application/x-chess-pgn",
        "User-Agent": "Chessloom/0.1 (+https://github.com/MindqueBlast/chessloom)",
      });
      return {
        ok: true,
        status: 200,
        text: async () => samplePgn,
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchLichessStudyPgn } = await import("./fetch-study");
    const result = await fetchLichessStudyPgn("https://lichess.org/study/abcDef12");

    expect(result).toEqual({
      studyId: "abcDef12",
      canonicalUrl: "https://lichess.org/study/abcDef12",
      pgnText: samplePgn,
      titleHint: "Italian Game",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws when study is not found or not public", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () => "",
      })),
    );

    const { fetchLichessStudyPgn } = await import("./fetch-study");
    await expect(fetchLichessStudyPgn("https://lichess.org/study/abcDef12")).rejects.toThrow(
      "Study not found or not public.",
    );
  });

  it("throws when response body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "   ",
      })),
    );

    const { fetchLichessStudyPgn } = await import("./fetch-study");
    await expect(fetchLichessStudyPgn("https://lichess.org/study/abcDef12")).rejects.toThrow(
      /empty|Failed to fetch/i,
    );
  });
});
