import { afterEach, describe, expect, it, vi } from "vitest";

const { supabaseCreateClient } = vi.hoisted(() => ({
  supabaseCreateClient: vi.fn(() => ({ role: "service" })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseCreateClient,
}));
vi.mock("server-only", () => ({}));

import { createServiceClient } from "./service";

describe("createServiceClient", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("fails closed when the server-only service key is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createServiceClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is required",
    );
    expect(supabaseCreateClient).not.toHaveBeenCalled();
  });

  it("creates an isolated non-persistent service client", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";

    createServiceClient();

    expect(supabaseCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "server-secret",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
