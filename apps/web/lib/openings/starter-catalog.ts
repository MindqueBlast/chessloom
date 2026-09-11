export type StarterLevel = "beginner" | "club";

export type StarterOpening = {
  id: string;
  title: string;
  level: StarterLevel;
  blurb: string;
  lichessStudyUrl: string;
  /** Starting position hint for UI (optional). */
  previewFen?: string;
};

/**
 * Curated public Lichess studies. Re-check monthly that each URL stays public.
 * Prefer shorter studies so first Learn sessions stay fast.
 */
export const STARTER_OPENINGS: readonly StarterOpening[] = [
  {
    id: "italian-beginner",
    title: "Italian Game (Giuoco Piano)",
    level: "beginner",
    blurb: "Quiet e4 e5 development — ideal first White repertoire.",
    lichessStudyUrl: "https://lichess.org/study/gh59AF8V",
    previewFen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  },
  {
    id: "london-beginner",
    title: "London System",
    level: "beginner",
    blurb: "Solid d4 setup with a clear plan against most Black replies.",
    lichessStudyUrl: "https://lichess.org/study/p1pdMu9b",
    previewFen: "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 2 3",
  },
  {
    id: "beginner-repertoire",
    title: "Beginner repertoire (White & Black)",
    level: "beginner",
    blurb: "A compact starter pack for both colors when you are new to openings.",
    lichessStudyUrl: "https://lichess.org/study/Ll9dcePm",
  },
  {
    id: "scotch-beginner",
    title: "Scotch Game",
    level: "beginner",
    blurb: "Open e4 e5 lines with early central tension — easy to understand.",
    lichessStudyUrl: "https://lichess.org/study/dJL6WB4L",
    previewFen: "r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4",
  },
  {
    id: "caro-beginner",
    title: "Caro-Kann Defense",
    level: "beginner",
    blurb: "A rock-solid answer to 1.e4 for Black with clear structures.",
    lichessStudyUrl: "https://lichess.org/study/73qj9l9D",
    previewFen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  },
  {
    id: "london-club",
    title: "London System repertoire",
    level: "club",
    blurb: "Deeper London ideas and common Black tries for club players.",
    lichessStudyUrl: "https://lichess.org/study/2EaSmZtz",
    previewFen: "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq - 0 3",
  },
  {
    id: "italian-club",
    title: "Italian with Evans & Fried Liver",
    level: "club",
    blurb: "Sharper Italian branches once the quiet lines feel familiar.",
    lichessStudyUrl: "https://lichess.org/study/KKjoTFZd",
    previewFen: "r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5",
  },
] as const;

export function getStarterOpening(id: string): StarterOpening | undefined {
  return STARTER_OPENINGS.find((opening) => opening.id === id);
}

export function isStarterOpeningId(id: string): boolean {
  return STARTER_OPENINGS.some((opening) => opening.id === id);
}
