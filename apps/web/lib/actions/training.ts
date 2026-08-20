"use server";

import {
  findNodeByPathKey,
  learnApplyUserMove,
  learnAutoOpponentIfNeeded,
  parseLearnCheckpoint,
  parsePracticeCheckpoint,
  practiceApplyMove,
  practiceReveal,
  serializeCheckpoint,
  type ChapterTree,
  type LearnState,
  type PositionProgress,
  type PracticeState,
  type SessionMode,
  type SideMode,
} from "@chessloom/chess-core";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

import {
  resumableLearnCheckpoint,
  resumablePracticeCheckpoint,
} from "../training/session";

import {
  assertSessionUsable,
  buildChapterTrees,
  createInitialTrainingCheckpoint,
  normalizeTrainingSideMode,
  parseClientCheckpointUpdate,
  progressFromRow,
  trainingResultRpcPayload,
  type ChapterRow,
  type NodeRow,
  type PracticeProgressRow,
  type ProgressRow,
} from "./training-helpers";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ServiceClient = ReturnType<typeof createServiceClient>;

type TrainingSessionRow = {
  id: string;
  user_id: string;
  study_id: string;
  mode: SessionMode;
  checkpoint: unknown;
  status: string;
  updated_at: string;
};

type MoveResult = {
  ok: boolean;
  expectedCount: number;
  progress?: PositionProgress;
  checkpoint: unknown;
};

function jsonValue(value: unknown): unknown {
  return JSON.parse(serializeCheckpoint(value)) as unknown;
}

async function currentUser(client: SupabaseClient): Promise<{ id: string }> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    throw new Error("Sign in before training");
  }
  return user;
}

async function abandonSession(session: TrainingSessionRow): Promise<void> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("training_sessions")
    .update({ status: "abandoned" })
    .eq("id", session.id)
    .eq("user_id", session.user_id)
    .eq("status", "active")
    .eq("updated_at", session.updated_at);
  if (error) {
    throw new Error(error.message);
  }
}

async function ownedSession(
  client: SupabaseClient,
  sessionId: string,
  mode: SessionMode,
): Promise<{ session: TrainingSessionRow; userId: string }> {
  const user = await currentUser(client);
  const { data, error } = await client
    .from("training_sessions")
    .select("id,user_id,study_id,mode,checkpoint,status,updated_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Training session was not found");
  }

  const session = data as TrainingSessionRow;
  try {
    assertSessionUsable(session, user.id, mode);
  } catch (guardError) {
    if (
      guardError instanceof Error &&
      guardError.message === "Training session has expired"
    ) {
      await abandonSession(session);
    }
    throw guardError;
  }

  return { session, userId: user.id };
}

async function studyChapters(
  client: SupabaseClient,
  studyId: string,
): Promise<ChapterTree[]> {
  const [chaptersResult, nodesResult] = await Promise.all([
    client
      .from("chapters")
      .select("id,chapter_index,name,initial_fen,headers")
      .eq("study_id", studyId)
      .order("chapter_index"),
    client
      .from("nodes")
      .select(
        "id,chapter_id,parent_id,path_key,fen,san,uci,ply,comment,nags",
      )
      .eq("study_id", studyId)
      .order("created_at"),
  ]);

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }
  if (nodesResult.error) {
    throw new Error(nodesResult.error.message);
  }

  return buildChapterTrees(
    (chaptersResult.data ?? []) as ChapterRow[],
    (nodesResult.data ?? []) as NodeRow[],
  );
}

function chapterForPath(chapters: ChapterTree[], pathKey: string): ChapterTree {
  const match = /^c(\d+):/.exec(pathKey);
  const chapter = match
    ? chapters.find((candidate) => candidate.index === Number(match[1]))
    : undefined;
  if (!chapter || !findNodeByPathKey(chapter, pathKey)) {
    throw new Error(`Training position was not found: ${pathKey}`);
  }
  return chapter;
}

async function saveSession(
  session: TrainingSessionRow,
  checkpoint: LearnState | PracticeState,
): Promise<unknown> {
  const client: ServiceClient = createServiceClient();
  const safeCheckpoint = jsonValue(checkpoint);
  const status = checkpoint.status === "complete" ? "completed" : "active";
  const { data, error } = await client
    .from("training_sessions")
    .update({ checkpoint: safeCheckpoint, status })
    .eq("id", session.id)
    .eq("user_id", session.user_id)
    .eq("status", "active")
    .eq("updated_at", session.updated_at)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Training session changed before the checkpoint was saved");
  }
  return safeCheckpoint;
}

async function scorePositionAndSave(
  session: TrainingSessionRow,
  userId: string,
  pathKey: string,
  correct: boolean,
  checkpoint: LearnState | PracticeState,
): Promise<{ progress: PositionProgress; checkpoint: unknown }> {
  if (userId !== session.user_id) {
    throw new Error("Training session is not owned by the current user");
  }
  const safeCheckpoint = jsonValue(checkpoint);
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc(
    "apply_training_result_and_checkpoint",
    trainingResultRpcPayload(
      userId,
      session.id,
      session.study_id,
      pathKey,
      correct,
      safeCheckpoint,
      session.updated_at,
    ),
  );

  if (error) {
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Training result did not return progress");
  }
  return {
    progress: progressFromRow(pathKey, row as ProgressRow),
    checkpoint: safeCheckpoint,
  };
}

function practiceState(checkpoint: unknown): PracticeState {
  return parsePracticeCheckpoint(serializeCheckpoint(checkpoint));
}

function learnState(checkpoint: unknown): LearnState {
  return parseLearnCheckpoint(serializeCheckpoint(checkpoint));
}

export type TrainingSessionStartOptions = {
  chapterIndex?: number;
  sideMode?: SideMode;
};

export async function startTrainingSessionAction(
  studyId: string,
  mode: SessionMode,
  options: TrainingSessionStartOptions = {},
): Promise<{ sessionId: string; checkpoint: unknown }> {
  const client = await createClient();
  const user = await currentUser(client);
  const [{ data: study, error: studyError }, { data: profile }] =
    await Promise.all([
      client.from("studies").select("id").eq("id", studyId).maybeSingle(),
      client
        .from("profiles")
        .select("default_side_mode")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
  if (studyError) {
    throw new Error(studyError.message);
  }
  if (!study) {
    throw new Error("Study was not found");
  }

  const sideMode =
    options.sideMode ??
    normalizeTrainingSideMode(profile?.default_side_mode);
  const [chapters, progressResult] = await Promise.all([
    studyChapters(client, studyId),
    mode === "practice"
      ? client
          .from("position_progress")
          .select(
            "path_key,attempts,correct_count,streak,mastery,last_reviewed_at,due_at",
          )
          .eq("study_id", studyId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (progressResult.error) {
    throw new Error(progressResult.error.message);
  }
  const checkpoint =
    mode === "learn"
      ? createInitialTrainingCheckpoint(
          "learn",
          chapters,
          sideMode,
          options.chapterIndex,
        )
      : createInitialTrainingCheckpoint(
          "practice",
          chapters,
          sideMode,
          (progressResult.data ?? []) as PracticeProgressRow[],
        );
  const safeCheckpoint = jsonValue(checkpoint);
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("training_sessions")
    .insert({
      user_id: user.id,
      study_id: studyId,
      mode,
      checkpoint: safeCheckpoint,
      status: checkpoint.status === "complete" ? "completed" : "active",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }

  return { sessionId: data.id as string, checkpoint: safeCheckpoint };
}

export async function submitPracticeMoveAction(input: {
  sessionId: string;
  pathKey: string;
  uci: string;
}): Promise<MoveResult> {
  const client = await createClient();
  const { session, userId } = await ownedSession(
    client,
    input.sessionId,
    "practice",
  );
  const state = practiceState(session.checkpoint);
  const card = state.queue[state.index];
  if (!card || card.pathKey !== input.pathKey) {
    throw new Error("Move does not match the current practice position");
  }

  const chapters = await studyChapters(client, session.study_id);
  const chapter = chapterForPath(chapters, input.pathKey);
  const result = practiceApplyMove(state, chapter, { uci: input.uci });
  const committed = await scorePositionAndSave(
    session,
    userId,
    input.pathKey,
    result.feedback.ok,
    result.state,
  );

  return {
    ok: result.feedback.ok,
    expectedCount: result.feedback.ok ? 0 : result.feedback.expected.length,
    progress: committed.progress,
    checkpoint: committed.checkpoint,
  };
}

export async function revealPracticeExpectedAction(
  sessionId: string,
  pathKey: string,
): Promise<{ sans: string[]; ucis: string[] }> {
  const client = await createClient();
  const { session } = await ownedSession(client, sessionId, "practice");
  const state = practiceState(session.checkpoint);
  const card = state.queue[state.index];
  if (!card || card.pathKey !== pathKey) {
    throw new Error("Reveal does not match the current practice position");
  }

  const chapters = await studyChapters(client, session.study_id);
  const chapter = chapterForPath(chapters, pathKey);
  const node = findNodeByPathKey(chapter, pathKey)!;
  await saveSession(session, practiceReveal(state));

  return {
    sans: node.children.flatMap((child) =>
      child.san === null ? [] : [child.san],
    ),
    ucis: node.children.flatMap((child) =>
      child.uci === null ? [] : [child.uci],
    ),
  };
}

export async function submitLearnMoveAction(input: {
  sessionId: string;
  pathKey: string;
  uci: string;
}): Promise<MoveResult> {
  const client = await createClient();
  const { session, userId } = await ownedSession(
    client,
    input.sessionId,
    "learn",
  );
  const state = learnState(session.checkpoint);
  if (state.pathKey !== input.pathKey) {
    throw new Error("Move does not match the current learn position");
  }

  const chapters = await studyChapters(client, session.study_id);
  const chapter = chapters.find(
    (candidate) => candidate.index === state.chapterIndex,
  );
  if (!chapter || !findNodeByPathKey(chapter, input.pathKey)) {
    throw new Error(`Training position was not found: ${input.pathKey}`);
  }

  const result = learnApplyUserMove(state, chapter, { uci: input.uci });
  const isScoredAttempt =
    result.feedback.ok || result.feedback.reason !== "opponent-turn";
  const nextState = result.feedback.ok
    ? learnAutoOpponentIfNeeded(result.state, chapter)
    : result.state;
  const committed = isScoredAttempt
    ? await scorePositionAndSave(
        session,
        userId,
        input.pathKey,
        result.feedback.ok,
        nextState,
      )
    : {
        progress: undefined,
        checkpoint: await saveSession(session, nextState),
      };

  return {
    ok: result.feedback.ok,
    expectedCount: result.feedback.ok ? 0 : result.feedback.expected.length,
    progress: committed.progress,
    checkpoint: committed.checkpoint,
  };
}

export async function saveCheckpointAction(
  sessionId: string,
  checkpoint: unknown,
): Promise<void> {
  const client = await createClient();
  const user = await currentUser(client);
  const { data, error } = await client
    .from("training_sessions")
    .select("id,user_id,study_id,mode,checkpoint,status,updated_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Training session was not found");
  }

  const session = data as TrainingSessionRow;
  assertSessionUsable(session, user.id, session.mode);
  const chapters = await studyChapters(client, session.study_id);

  if (session.mode === "learn") {
    const state = parseClientCheckpointUpdate(
      "learn",
      checkpoint,
      session.checkpoint,
    );
    const chapter = chapters.find(
      (candidate) => candidate.index === state.chapterIndex,
    );
    if (
      !chapter ||
      ![state.pathKey, ...state.stack].every((pathKey) =>
        findNodeByPathKey(chapter, pathKey),
      )
    ) {
      throw new Error("Learn checkpoint contains an unknown position");
    }
    await saveSession(session, state);
    return;
  }

  const state = parseClientCheckpointUpdate(
    "practice",
    checkpoint,
    session.checkpoint,
  );
  const validQueue = state.queue.every((card) => {
    const chapter = chapterForPath(chapters, card.pathKey);
    return findNodeByPathKey(chapter, card.pathKey)?.fen === card.fen;
  });
  if (!validQueue) {
    throw new Error("Practice checkpoint contains an unknown position");
  }
  await saveSession(session, state);
}

export async function resumeSessionAction(
  studyId: string,
  mode: SessionMode,
): Promise<{ sessionId: string; checkpoint: unknown } | null> {
  const client = await createClient();
  const user = await currentUser(client);
  const { data, error } = await client
    .from("training_sessions")
    .select("id,user_id,study_id,mode,checkpoint,status,updated_at")
    .eq("study_id", studyId)
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const session = data as TrainingSessionRow;
  try {
    assertSessionUsable(session, user.id, mode);
  } catch (guardError) {
    if (
      guardError instanceof Error &&
      guardError.message === "Training session has expired"
    ) {
      await abandonSession(session);
      return null;
    }
    throw guardError;
  }

  const chapters = await studyChapters(client, session.study_id);
  const checkpoint =
    mode === "learn"
      ? resumableLearnCheckpoint(session.checkpoint, chapters)
      : resumablePracticeCheckpoint(session.checkpoint, chapters);
  if (!checkpoint) {
    await abandonSession(session);
    return null;
  }

  return { sessionId: session.id, checkpoint: jsonValue(checkpoint) };
}
