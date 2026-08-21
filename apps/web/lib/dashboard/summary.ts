const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardStudy = {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
};

export type DashboardChapter = {
  study_id: string;
};

export type DashboardNode = {
  id: string;
  parent_id: string | null;
  study_id: string;
  path_key: string;
};

export type DashboardProgress = {
  study_id: string;
  path_key: string;
  mastery: number;
  due_at: string;
};

export type StudySummary = DashboardStudy & {
  chapterCount: number;
  moveCount: number;
  mastery: number;
  dueCount: number;
  weakCount: number;
};

function utcDay(value: Date): number {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

export function calculateTrainingStreak(
  completedAt: string[],
  now = new Date(),
): number {
  const days = new Set(
    completedAt
      .map((value) => new Date(value))
      .filter((value) => Number.isFinite(value.getTime()))
      .map(utcDay),
  );
  const today = utcDay(now);
  let day = days.has(today) ? today : today - DAY_MS;
  let streak = 0;

  while (days.has(day)) {
    streak += 1;
    day -= DAY_MS;
  }

  return streak;
}

export function buildDashboardSummary(
  studies: DashboardStudy[],
  chapters: DashboardChapter[],
  nodes: DashboardNode[],
  progressRows: DashboardProgress[],
  now = new Date(),
): {
  dueCount: number;
  weakPathKeys: string[];
  weakPositions: Array<{
    studyId: string;
    pathKey: string;
    mastery: number;
  }>;
  studies: StudySummary[];
} {
  const progressByPosition = new Map(
    progressRows.map((row) => [`${row.study_id}:${row.path_key}`, row]),
  );
  const parentIds = new Set(
    nodes.flatMap((node) => (node.parent_id ? [node.parent_id] : [])),
  );
  const nowIso = now.toISOString();
  const weakPositions: Array<{
    studyId: string;
    pathKey: string;
    mastery: number;
  }> = [];
  let dueCount = 0;

  const summaries = studies.map((study) => {
    const studyNodes = nodes.filter((node) => node.study_id === study.id);
    const trainableNodes = studyNodes.filter((node) => parentIds.has(node.id));
    let studyDueCount = 0;
    let studyWeakCount = 0;
    let masteryTotal = 0;

    for (const node of trainableNodes) {
      const progress = progressByPosition.get(`${study.id}:${node.path_key}`);
      const mastery = progress?.mastery ?? 0;
      masteryTotal += mastery;
      if (!progress || progress.due_at <= nowIso) {
        dueCount += 1;
        studyDueCount += 1;
      }
      if (mastery < 40) {
        studyWeakCount += 1;
        weakPositions.push({
          studyId: study.id,
          pathKey: node.path_key,
          mastery,
        });
      }
    }

    return {
      ...study,
      chapterCount: chapters.filter((chapter) => chapter.study_id === study.id)
        .length,
      moveCount: Math.max(
        0,
        studyNodes.length -
          chapters.filter((chapter) => chapter.study_id === study.id).length,
      ),
      mastery:
        trainableNodes.length > 0
          ? Math.round(masteryTotal / trainableNodes.length)
          : 0,
      dueCount: studyDueCount,
      weakCount: studyWeakCount,
    };
  });

  weakPositions.sort(
    (a, b) => a.mastery - b.mastery || a.pathKey.localeCompare(b.pathKey),
  );

  return {
    dueCount,
    weakPathKeys: weakPositions.map(({ pathKey }) => pathKey),
    weakPositions,
    studies: summaries,
  };
}
