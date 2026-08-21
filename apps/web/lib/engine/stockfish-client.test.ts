import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ENGINE_DEPTH,
  createStockfishClient,
  parseUciInfoLine,
} from "./stockfish-client";

describe("parseUciInfoLine", () => {
  it("parses centipawn score, depth, and pv", () => {
    expect(
      parseUciInfoLine(
        "info depth 15 seldepth 20 multipv 1 score cp 34 nodes 1 nps 1 time 1 pv e2e4 e7e5 g1f3",
      ),
    ).toEqual({
      cp: 34,
      mate: null,
      depth: 15,
      pv: ["e2e4", "e7e5", "g1f3"],
    });
  });

  it("parses mate score", () => {
    expect(
      parseUciInfoLine("info depth 12 score mate -3 pv d1h5 g8h8 h5h7"),
    ).toEqual({
      cp: null,
      mate: -3,
      depth: 12,
      pv: ["d1h5", "g8h8", "h5h7"],
    });
  });

  it("returns null for non-info lines", () => {
    expect(parseUciInfoLine("bestmove e2e4 ponder e7e5")).toBeNull();
  });
});

describe("createStockfishClient", () => {
  const fen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  let posted: string[];
  let worker: {
    onmessage: ((event: MessageEvent<string>) => void) | null;
    onerror: ((event: Event) => void) | null;
    postMessage: (message: string) => void;
    terminate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    posted = [];
    worker = {
      onmessage: null,
      onerror: null,
      postMessage: (message: string) => {
        posted.push(message);
        if (message === "uci") {
          worker.onmessage?.({ data: "uciok" } as MessageEvent<string>);
        } else if (message === "isready") {
          worker.onmessage?.({ data: "readyok" } as MessageEvent<string>);
        } else if (message.startsWith("go depth")) {
          worker.onmessage?.({
            data:
              "info depth 15 score cp 25 pv e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
          } as MessageEvent<string>);
          worker.onmessage?.({ data: "bestmove e2e4 ponder e7e5" } as MessageEvent<string>);
        }
      },
      terminate: vi.fn(),
    };

    vi.stubGlobal("window", {
      Worker: vi.fn(() => worker),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when called outside the browser", () => {
    vi.unstubAllGlobals();
    expect(() => createStockfishClient()).toThrow(/browser/i);
  });

  it("initializes UCI and resolves analysis from info lines", async () => {
    const client = createStockfishClient({ workerUrl: "/stockfish/test.js" });

    await expect(client.analyze(fen)).resolves.toEqual({
      cp: 25,
      mate: null,
      depth: 15,
      pv: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"],
    });

    expect(posted).toEqual([
      "uci",
      "isready",
      `position fen ${fen}`,
      `go depth ${DEFAULT_ENGINE_DEPTH}`,
    ]);
  });

  it("uses a custom search depth", async () => {
    const client = createStockfishClient({ workerUrl: "/stockfish/test.js" });
    await client.analyze(fen, 10);

    expect(posted.at(-1)).toBe("go depth 10");
  });

  it("stop sends stop to the worker", async () => {
    worker.postMessage = (message: string) => {
      posted.push(message);
      if (message === "uci") {
        worker.onmessage?.({ data: "uciok" } as MessageEvent<string>);
      } else if (message === "isready") {
        worker.onmessage?.({ data: "readyok" } as MessageEvent<string>);
      }
    };

    const client = createStockfishClient({ workerUrl: "/stockfish/test.js" });
    const pending = client.analyze(fen);
    await Promise.resolve();
    client.stop();

    await expect(pending).rejects.toThrow(/stopped/i);
    expect(posted).toContain("stop");
  });

  it("terminate shuts down the worker", async () => {
    const client = createStockfishClient({ workerUrl: "/stockfish/test.js" });
    await client.analyze(fen);
    client.terminate();

    expect(worker.terminate).toHaveBeenCalled();
  });
});
