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
