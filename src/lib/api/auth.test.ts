import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAdminRequest } from "./auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireAdminRequest", () => {
  it("allows development requests when no token is configured", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(requireAdminRequest(new Request("http://localhost/api"))).toBeNull();
  });

  it("rejects missing token when admin token is configured", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "secret");
    const response = requireAdminRequest(new Request("http://localhost/api"));
    expect(response?.status).toBe(401);
  });

  it("accepts bearer and x-signal-admin-token headers", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "secret");
    expect(requireAdminRequest(new Request("http://localhost/api", { headers: { authorization: "Bearer secret" } }))).toBeNull();
    expect(requireAdminRequest(new Request("http://localhost/api", { headers: { "x-signal-admin-token": "secret" } }))).toBeNull();
  });

  it("rejects wrong tokens with matching length", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "secret");
    const response = requireAdminRequest(new Request("http://localhost/api", { headers: { "x-signal-admin-token": "secRet" } }));
    expect(response?.status).toBe(401);
  });

  it("rejects non-ascii wrong tokens without throwing", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "éé");
    const response = requireAdminRequest(new Request("http://localhost/api", { headers: { "x-signal-admin-token": "aa" } }));
    expect(response?.status).toBe(401);
  });

  it("fails closed in production without APP_ADMIN_TOKEN", () => {
    vi.stubEnv("APP_ADMIN_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    const response = requireAdminRequest(new Request("http://localhost/api"));
    expect(response?.status).toBe(401);
  });
});
