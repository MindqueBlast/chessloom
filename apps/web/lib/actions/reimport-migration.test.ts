import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDir = resolve(process.cwd(), "../../supabase/migrations");
const originalPath = resolve(migrationsDir, "20260820190730_reimport_study_rpc.sql");
const definerPath = resolve(
  migrationsDir,
  "20260820200000_reimport_study_definer.sql",
);
const authorityPath = resolve(
  migrationsDir,
  "0004_training_service_authority.sql",
);

describe("reimport_study migration", () => {
  it("originally replaced the tree and pruned unmatched progress as invoker", async () => {
    const sql = await readFile(originalPath, "utf8");

    expect(sql).toContain("create function public.reimport_study(");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("delete from public.chapters");
    expect(sql).toContain("insert into public.nodes");
    expect(sql).toMatch(
      /delete from public\.position_progress[\s\S]+not exists[\s\S]+from public\.nodes/,
    );
  });

  it("redefines reimport_study as SECURITY DEFINER after DELETE was revoked", async () => {
    const [authority, definer, files] = await Promise.all([
      readFile(authorityPath, "utf8"),
      readFile(definerPath, "utf8"),
      readdir(migrationsDir),
    ]);
    const ordered = [...files].filter((name) => name.endsWith(".sql")).sort();

    expect(authority).toContain(
      "revoke insert, update, delete on public.position_progress from authenticated",
    );
    expect(ordered.indexOf("0004_training_service_authority.sql")).toBeLessThan(
      ordered.indexOf("20260820200000_reimport_study_definer.sql"),
    );
    expect(ordered.indexOf("20260820190730_reimport_study_rpc.sql")).toBeLessThan(
      ordered.indexOf("20260820200000_reimport_study_definer.sql"),
    );

    expect(definer).toContain("create or replace function public.reimport_study(");
    expect(definer).toContain("security definer");
    expect(definer).toContain("set search_path = ''");
    expect(definer).toContain("and user_id = (select auth.uid())");
    expect(definer).toMatch(
      /delete from public\.position_progress[\s\S]+progress\.user_id = \(select auth\.uid\(\)\)[\s\S]+not exists[\s\S]+from public\.nodes/,
    );
    expect(definer).not.toContain("security invoker");
    expect(definer).toMatch(
      /grant execute on function public\.reimport_study\([\s\S]+to authenticated/,
    );
  });
});
