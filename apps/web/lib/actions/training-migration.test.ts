import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/0004_training_service_authority.sql",
);

describe("training authority migration", () => {
  it("makes scoring and checkpoint writes service-only and atomic", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain(
      "revoke insert, update, delete on public.position_progress from authenticated",
    );
    expect(sql).toContain(
      "revoke insert, update on public.training_sessions from authenticated",
    );
    expect(sql).toContain(
      "create function public.apply_training_result_and_checkpoint(",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("p_correct boolean");
    expect(sql).toContain("p_checkpoint jsonb");
    expect(sql).not.toMatch(/p_mastery|p_attempts|p_correct_count|p_streak/);
    expect(sql).toMatch(
      /update public\.training_sessions[\s\S]+checkpoint = p_checkpoint[\s\S]+updated_at = p_expected_updated_at/,
    );
    expect(sql).toContain("on conflict (user_id, study_id, path_key)");
    expect(sql).toContain(
      "revoke all on function public.apply_training_result(uuid, text, boolean)",
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_training_result_and_checkpoint\([\s\S]+from public, authenticated, anon/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_training_result_and_checkpoint\([\s\S]+to service_role/,
    );
  });
});
