import {
  parseLearnCheckpoint,
  serializeCheckpoint,
  type SessionMode,
  type SideMode,
} from "@chessloom/chess-core";

export const SESSION_SIDE_MODES: Array<{ value: SideMode; label: string }> = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "both", label: "Both" },
  { value: "random", label: "Random" },
];

export type TrainingStartQuery = {
  chapterIndex?: number;
  sideMode?: SideMode;
  fresh?: boolean;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseChapterIndexParam(
  value: string | string[] | undefined,
): number | undefined {
  const raw = firstParam(value);
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return undefined;
  }
  return Number(raw);
}

export function parseSessionSideMode(
  value: string | string[] | undefined,
): SideMode | undefined {
  const raw = firstParam(value);
  return raw === "white" ||
    raw === "black" ||
    raw === "both" ||
    raw === "random"
    ? raw
    : undefined;
}

export function parseTrainingStartQuery(searchParams: {
  chapter?: string | string[];
  side?: string | string[];
  fresh?: string | string[];
}): TrainingStartQuery {
  return {
    chapterIndex: parseChapterIndexParam(searchParams.chapter),
    sideMode: parseSessionSideMode(searchParams.side),
    fresh: firstParam(searchParams.fresh) === "1",
  };
}

export function trainingPath(
  studyId: string,
  mode: SessionMode,
  query: TrainingStartQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.chapterIndex !== undefined) {
    params.set("chapter", String(query.chapterIndex));
  }
  if (query.sideMode) {
    params.set("side", query.sideMode);
  }
  if (query.fresh) {
    params.set("fresh", "1");
  }
  const qs = params.toString();
  return `/studies/${studyId}/${mode}${qs ? `?${qs}` : ""}`;
}

export function learnCheckpointMatchesChapter(
  checkpoint: unknown,
  chapterIndex: number | undefined,
): boolean {
  if (chapterIndex === undefined) {
    return true;
  }
  try {
    return (
      parseLearnCheckpoint(serializeCheckpoint(checkpoint)).chapterIndex ===
      chapterIndex
    );
  } catch {
    return false;
  }
}
