import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { updateDefaultSideModeAction } from "./settings";

describe("updateDefaultSideModeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates only the signed-in user's profile", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    const eq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) }));
    const update = vi.fn(() => ({ eq }));
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({ update })),
    });

    await expect(updateDefaultSideModeAction("black")).resolves.toEqual({
      ok: true,
    });
    expect(update).toHaveBeenCalledWith({ default_side_mode: "black" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects invalid side values before accessing the database", async () => {
    await expect(updateDefaultSideModeAction("random")).resolves.toEqual({
      ok: false,
      error: "Choose a supported default side",
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});
