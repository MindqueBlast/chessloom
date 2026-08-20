import { parseGames, type ParseTree } from "@mliebelt/pgn-parser";
import { buildChapter } from "../tree/build.js";
import type { StudyTree } from "../types.js";

export class PgnParseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PgnParseError";
  }
}

function stringHeaders(game: ParseTree): Record<string, string> {
  return Object.fromEntries(
    Object.entries(game.tags ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function parsePgnToStudy(pgn: string): StudyTree {
  if (pgn.trim().length === 0) {
    throw new PgnParseError("PGN input is empty");
  }

  try {
    const games = parseGames(pgn);
    if (games.length === 0) {
      throw new PgnParseError("PGN contains no games");
    }

    const chapters = games.map((game, index) =>
      buildChapter(game, index, stringHeaders(game)),
    );

    return {
      title: chapters[0]!.headers.Event ?? "Untitled study",
      chapters,
    };
  } catch (error) {
    if (error instanceof PgnParseError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new PgnParseError(`Failed to parse PGN: ${message}`, {
      cause: error,
    });
  }
}
