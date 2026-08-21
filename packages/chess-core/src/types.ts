export type Uci = string;
export type San = string;
export type Fen = string;
export type PathKey = string;

export type Nag = number;

export interface TreeNode {
  id: string;
  pathKey: PathKey;
  fen: Fen;
  san: San | null;
  uci: Uci | null;
  ply: number;
  comment: string | null;
  nags: Nag[];
  children: TreeNode[];
}

export interface ChapterTree {
  index: number;
  title: string;
  headers: Record<string, string>;
  startingFen: Fen;
  root: TreeNode;
}

export interface StudyTree {
  title: string;
  chapters: ChapterTree[];
}

export interface PositionProgress {
  pathKey: PathKey;
  attempts: number;
  correctCount: number;
  streak: number;
  mastery: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  fsrsStability: number;
  fsrsDifficulty: number;
  fsrsElapsedDays: number;
  fsrsScheduledDays: number;
  fsrsReps: number;
  fsrsLapses: number;
  fsrsLearningSteps: number;
  fsrsState: number;
  fsrsLastReview: string | null;
}

export type SideMode = "white" | "black" | "both" | "random";
export type SessionMode = "learn" | "practice";
