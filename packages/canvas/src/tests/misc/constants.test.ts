import { BASE_URL, STORAGE_URL, TURNSTILE_SITE_KEY } from "@/lib/constants";
import { describe, expect, it } from "vitest";

describe("lib/constants", () => {
  it("provides valid default fallback for BASE_URL when env is unset", () => {
    expect(typeof BASE_URL).toBe("string");
    expect(BASE_URL.length).toBeGreaterThan(0);
    expect(BASE_URL).toBe(
      import.meta.env.VITE_SITE_URL || "http://localhost:5173",
    );
  });

  it("provides valid default fallback for STORAGE_URL when env is unset", () => {
    expect(typeof STORAGE_URL).toBe("string");
    expect(STORAGE_URL.length).toBeGreaterThan(0);
    expect(STORAGE_URL).toBe(
      import.meta.env.VITE_STORAGE_URL || "https://assets.zerosketch.dev",
    );
  });

  it("reflects TURNSTILE_SITE_KEY from environment or defaults to undefined", () => {
    expect(TURNSTILE_SITE_KEY).toBe(import.meta.env.VITE_TURNSTILE_SITE_KEY);
  });
});
