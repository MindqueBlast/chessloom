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

  it("does not delete the database row when Storage deletion fails", async () => {
    const deleteRow = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
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

    expect(result).toEqual({ ok: false, error: "storage deletion failed" });
    expect(deleteRow).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
