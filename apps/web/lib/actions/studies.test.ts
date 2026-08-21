import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, parsePgnToStudy, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  parsePgnToStudy: vi.fn(() => ({ title: "Imported", chapters: [] })),
  revalidatePath: vi.fn(),
}));

vi.mock("@chessloom/chess-core", () => ({ parsePgnToStudy }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/studies/import", () => ({
  flattenStudyTree: vi.fn(() => []),
  importSource: vi.fn(() => ({
    sourceType: "pgn_upload",
    useStorage: true,
  })),
}));

import {
  deleteStudyAction,
  importPgnAction,
  reimportPgnAction,
  renameStudyAction,
} from "./studies";

function largePgn() {
  return `[Event "Large"]\n\n1. e4 *{${"x".repeat(200_001)}}`;
}

describe("study action failure paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes an uploaded PGN when the import RPC throws", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove,
        })),
      },
      rpc: vi.fn().mockRejectedValue(new Error("serialization failed")),
    });

    const result = await importPgnAction({ pgnText: largePgn() });

    expect(result).toEqual({ ok: false, error: "serialization failed" });
    expect(remove).toHaveBeenCalledOnce();
  });

  it("surfaces both import and cleanup failures", async () => {
    const remove = vi.fn().mockResolvedValue({
      error: { message: "storage unavailable" },
    });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove,
        })),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "database rejected import" },
      }),
    });

    const result = await importPgnAction({ pgnText: largePgn() });

    expect(result).toEqual({
      ok: false,
      error:
        "database rejected import Cleanup of the uploaded PGN also failed: storage unavailable",
    });
  });

  it("reimports through one RPC and removes the superseded stored PGN", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: "study-1", error: null });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { pgn_storage_path: "user-1/old.pgn" },
              error: null,
            }),
          })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({ upload, remove })),
      },
      rpc,
    });

    const result = await reimportPgnAction("study-1", {
      pgnText: largePgn(),
    });

    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(rpc).toHaveBeenCalledWith(
      "reimport_study",
      expect.objectContaining({
        p_study_id: "study-1",
        p_source_type: "pgn_upload",
        p_pgn_text: null,
        p_chapters: [],
      }),
    );
    expect(remove).toHaveBeenCalledWith(["user-1/old.pgn"]);
    expect(revalidatePath).toHaveBeenCalledWith("/studies/study-1");
  });

  it("cleans up the replacement upload when reimport fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { pgn_storage_path: "user-1/old.pgn" },
              error: null,
            }),
          })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({ upload, remove })),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "replacement rejected" },
      }),
    });

    const result = await reimportPgnAction("study-1", {
      pgnText: largePgn(),
    });

    expect(result).toEqual({ ok: false, error: "replacement rejected" });
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalledWith(["user-1/old.pgn"]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("fails rename when no study row was updated", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ maybeSingle })),
          })),
        })),
      })),
    });

    const result = await renameStudyAction("missing-study", "New title");

    expect(result).toEqual({
      ok: false,
      error: "The study could not be renamed.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes the database row first and warns if storage cleanup fails", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRow = vi.fn(() => ({ eq }));
    createClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { pgn_storage_path: "user-1/source.pgn" },
              error: null,
            }),
          })),
        })),
        delete: deleteRow,
      })),
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockResolvedValue({
            error: { message: "storage deletion failed" },
          }),
        })),
      },
    });

    const result = await deleteStudyAction("study-1");

    expect(result).toEqual({
      ok: true,
      studyId: "study-1",
      warning: "Study deleted. The stored PGN file could not be removed.",
    });
    expect(deleteRow).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith("id", "study-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("treats a missing stored PGN as successful cleanup after the row is deleted", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { pgn_storage_path: "user-1/gone.pgn" },
              error: null,
            }),
          })),
        })),
        delete: vi.fn(() => ({ eq })),
      })),
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockResolvedValue({
            error: { message: "Object not found", statusCode: "404" },
          }),
        })),
      },
    });

    await expect(deleteStudyAction("study-1")).resolves.toEqual({
      ok: true,
      studyId: "study-1",
    });
  });
});
