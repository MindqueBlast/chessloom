const STUDY_ID = /^[a-zA-Z0-9]{8}$/;

export function parseLichessStudyUrl(input: string): {
  studyId: string;
  canonicalUrl: string;
} {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Enter a valid Lichess study URL.");
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "lichess.org") {
    throw new Error("Only lichess.org study URLs are supported.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "study" || !parts[1] || !STUDY_ID.test(parts[1])) {
    throw new Error("Enter a Lichess study URL like https://lichess.org/study/xxxxxxxx.");
  }

  const studyId = parts[1];
  return {
    studyId,
    canonicalUrl: `https://lichess.org/study/${studyId}`,
  };
}

/** Deep-link the current FEN into Lichess play-vs-computer. */
export function buildLichessPlayAiUrl(
  fen: string,
  color?: "white" | "black",
): string {
  const params = new URLSearchParams();
  params.set("fen", fen);
  if (color) {
    params.set("color", color);
  }
  return `https://lichess.org/?${params.toString()}#ai`;
}

