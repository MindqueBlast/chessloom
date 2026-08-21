import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDir = resolve(process.cwd(), "../../supabase/migrations");
const authorityPath = resolve(
  migrationsDir,
  "0004_training_service_authority.sql",
);
const fsrsPath = resolve(
  migrationsDir,
  "20260821140000_fsrs_progress.sql",
);

describe("training authority migration", () => {
  it("makes scoring and checkpoint writes service-only and atomic", async () => {
    const sql = await readFile(authorityPath, "utf8");

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

describe("FSRS progress migration", () => {
  it("adds FSRS columns and replaces RPCs with TS-authored progress upserts", async () => {
    const [sql, authority, files] = await Promise.all([
      readFile(fsrsPath, "utf8"),
      readFile(authorityPath, "utf8"),
      readdir(migrationsDir),
    ]);
    const ordered = [...files].filter((name) => name.endsWith(".sql")).sort();

    expect(ordered.indexOf("0004_training_service_authority.sql")).toBeLessThan(
      ordered.indexOf("20260821140000_fsrs_progress.sql"),
    );

    expect(sql).toContain(
      "add column if not exists fsrs_stability double precision not null default 0",
    );
    expect(sql).toContain(
      "add column if not exists fsrs_learning_steps integer not null default 0",
    );
    expect(sql).toContain(
      "add column if not exists fsrs_last_review timestamptz",
    );
    expect(sql).toContain(
      "drop function if exists public.apply_training_result(uuid, text, boolean)",
    );
    expect(sql).toContain(
      "drop function if exists public.apply_training_result_and_checkpoint(",
    );
    expect(sql).toContain("private.validate_training_progress(p_progress jsonb)");
    expect(sql).toContain("p_progress jsonb");
    expect(sql).toContain("fsrs_learning_steps = excluded.fsrs_learning_steps");
    expect(sql).not.toMatch(/mastery \+ 8|mastery - 15|least\(100, progress\.mastery/);
    expect(sql).toMatch(
      /create function public\.apply_training_result_and_checkpoint\([\s\S]+p_progress jsonb[\s\S]+p_checkpoint jsonb[\s\S]+p_expected_updated_at timestamptz/,
    );
    expect(sql).toMatch(
      /update public\.training_sessions[\s\S]+checkpoint = p_checkpoint[\s\S]+updated_at = p_expected_updated_at/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_training_result_and_checkpoint\([\s\S]+from public, authenticated, anon/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_training_result_and_checkpoint\([\s\S]+to service_role/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_training_result\([\s\S]+from public, authenticated, anon/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_training_result\([\s\S]+to service_role/,
    );

    expect(authority).toMatch(/mastery \+ 8|mastery - 15/);
    expect(sql).not.toMatch(/mastery \+ 8|mastery - 15/);
  });
});
