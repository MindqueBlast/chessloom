import "server-only";

import { parseLichessStudyUrl } from "@chessloom/chess-core";

const USER_AGENT = "Chessloom/0.1 (+https://github.com/MindqueBlast/chessloom)";
const EVENT_HEADER = /\[Event\s+"([^"]*)"\]/;

export async function fetchLichessStudyPgn(urlInput: string): Promise<{
  studyId: string;
  canonicalUrl: string;
  pgnText: string;
  titleHint: string | null;
}> {
  const { studyId, canonicalUrl } = parseLichessStudyUrl(urlInput);

  const response = await fetch(
    `https://lichess.org/api/study/${studyId}.pgn?clocks=false`,
    {
      headers: {
        Accept: "application/x-chess-pgn",
        "User-Agent": USER_AGENT,
      },
    },
  );

  if (
    response.status === 404 ||
    response.status === 401 ||
    response.status === 403
  ) {
    throw new Error("Study not found or not public.");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Lichess study PGN (${response.status}).`);
  }

  const pgnText = (await response.text()).trim();
  if (!pgnText) {
    throw new Error("Failed to fetch Lichess study PGN: empty response.");
  }

  const eventMatch = pgnText.match(EVENT_HEADER);
  const titleHint = eventMatch?.[1] ?? null;

  return {
    studyId,
    canonicalUrl,
    pgnText,
    titleHint,
  };
}
