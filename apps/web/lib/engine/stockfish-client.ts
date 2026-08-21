/**
 * Browser-only Stockfish UCI client. Import from client components or hooks only.
 */

export type EngineEval = {
  cp: number | null;
  mate: number | null;
  depth: number;
  pv: string[];
};

export const DEFAULT_ENGINE_DEPTH = 15;

const DEFAULT_WORKER_URL = "/stockfish/stockfish-18-lite-single.js";

const EMPTY_EVAL: EngineEval = {
  cp: null,
  mate: null,
  depth: 0,
  pv: [],
};

type StockfishClientOptions = {
  workerUrl?: string;
  createWorker?: (url: string) => Worker;
};

export function parseUciInfoLine(line: string): EngineEval | null {
  if (!line.startsWith("info ")) {
    return null;
  }

  const depthMatch = line.match(/(?:^|\s)depth (\d+)/);
  if (!depthMatch) {
    return null;
  }

  const cpMatch = line.match(/score cp (-?\d+)/);
  const mateMatch = line.match(/score mate (-?\d+)/);
  const pvIndex = line.indexOf(" pv ");
  const pv =
    pvIndex === -1
      ? []
      : line
          .slice(pvIndex + 4)
          .trim()
          .split(/\s+/)
          .filter(Boolean);

  return {
    cp: cpMatch ? Number(cpMatch[1]) : null,
    mate: mateMatch ? Number(mateMatch[1]) : null,
    depth: Number(depthMatch[1]),
    pv,
  };
}

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Stockfish client is browser-only");
  }
}

export function createStockfishClient(options: StockfishClientOptions = {}): {
  analyze: (fen: string, depth?: number) => Promise<EngineEval>;
  stop: () => void;
  terminate: () => void;
} {
  assertBrowser();

  const workerUrl = options.workerUrl ?? DEFAULT_WORKER_URL;
  const createWorker =
    options.createWorker ??
    ((url: string) => new window.Worker(url, { type: "classic" }));

  let worker: Worker | null = null;
  let readyPromise: Promise<void> | null = null;
  let readyResolve: (() => void) | null = null;
  let pendingResolve: ((value: EngineEval) => void) | null = null;
  let pendingReject: ((reason: Error) => void) | null = null;
  let latestEval: EngineEval = { ...EMPTY_EVAL };
  let initStep: "uci" | "ready" | "done" = "uci";

  const handleMessage = (event: MessageEvent<string>) => {
    const line = event.data;
    if (typeof line !== "string") {
      return;
    }

    if (initStep !== "done") {
      if (initStep === "uci" && line === "uciok") {
        initStep = "ready";
        worker?.postMessage("isready");
        return;
      }
      if (initStep === "ready" && line === "readyok") {
        initStep = "done";
        readyResolve?.();
        readyResolve = null;
        return;
      }
    }

    const parsed = parseUciInfoLine(line);
    if (parsed && parsed.depth >= latestEval.depth) {
      latestEval = parsed;
      return;
    }

    if (line.startsWith("bestmove ") && pendingResolve) {
      pendingResolve(latestEval);
      pendingResolve = null;
      pendingReject = null;
    }
  };

  const ensureWorker = (): Worker => {
    if (worker) {
      return worker;
    }

    worker = createWorker(workerUrl);
    const activeWorker = worker;
    worker.onmessage = handleMessage;
    initStep = "uci";
    readyPromise = new Promise((resolve, reject) => {
      readyResolve = resolve;
      activeWorker.postMessage("uci");
      activeWorker.onerror = () => {
        reject(new Error("Stockfish worker failed to start"));
      };
    });

    return worker;
  };

  const analyze = async (fen: string, depth = DEFAULT_ENGINE_DEPTH): Promise<EngineEval> => {
    ensureWorker();
    await readyPromise;

    if (pendingReject) {
      pendingReject(new Error("Stockfish analysis stopped"));
      pendingResolve = null;
      pendingReject = null;
    }

    latestEval = { ...EMPTY_EVAL };

    return new Promise<EngineEval>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      worker?.postMessage(`position fen ${fen}`);
      worker?.postMessage(`go depth ${depth}`);
    });
  };

  const stop = (): void => {
    if (pendingReject) {
      pendingReject(new Error("Stockfish analysis stopped"));
      pendingResolve = null;
      pendingReject = null;
    }
    worker?.postMessage("stop");
  };

  const terminate = (): void => {
    if (pendingReject) {
      pendingReject(new Error("Stockfish analysis stopped"));
      pendingResolve = null;
      pendingReject = null;
    }
    worker?.terminate();
    worker = null;
    readyPromise = null;
    readyResolve = null;
    latestEval = { ...EMPTY_EVAL };
    initStep = "uci";
  };

  return { analyze, stop, terminate };
}
