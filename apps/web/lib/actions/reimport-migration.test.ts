import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/20260820190730_reimport_study_rpc.sql",
);

describe("reimport_study migration", () => {
  it("replaces the tree and removes only progress missing from the replacement", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create function public.reimport_study(");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("delete from public.chapters");
    expect(sql).toContain("insert into public.nodes");
    expect(sql).toMatch(
      /delete from public\.position_progress[\s\S]+not exists[\s\S]+from public\.nodes/,
    );
  });
});
