import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/0003_training_authority.sql",
);

describe("training authority migration", () => {
  it("removes direct progress writes and exposes only result-based scoring", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain(
      "revoke insert, update, delete on public.position_progress from authenticated",
    );
    expect(sql).toContain("create function public.apply_training_result(");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("p_correct boolean");
    expect(sql).not.toMatch(/p_mastery|p_attempts|p_correct_count|p_streak/);
    expect(sql).toMatch(/where id = p_study_id[\s\S]+user_id = \(select auth\.uid\(\)\)/);
    expect(sql).toContain("on conflict (user_id, study_id, path_key)");
  });
});
