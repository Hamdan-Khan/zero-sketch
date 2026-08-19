import { api } from "@/lib/api/api";
import { useFetchDiagram, useUploadDiagram } from "@/lib/api/hooks";
import { STORAGE_URL } from "@/lib/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React, { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient, children });
};

describe("API Hooks: useUploadDiagram & useFetchDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useUploadDiagram", () => {
    it("submits FormData with file and no turnstile header when token is omitted", async () => {
      const mockPost = vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({
          message: "Uploaded successfully",
          success: true,
          id: "diag-abc-123",
        }),
      });
      vi.spyOn(api, "post").mockImplementation(mockPost);

      const { result } = renderHook(() => useUploadDiagram(), {
        wrapper: createQueryWrapper(),
      });

      const blob = new Blob(["diagram payload content"], {
        type: "application/octet-stream",
      });

      let res;
      await act(async () => {
        res = await result.current.mutateAsync({ file: blob });
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [endpoint, options] = mockPost.mock.calls[0];
      expect(endpoint).toBe("diagram/upload");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get("file")).toBeInstanceOf(Blob);
      expect(options.headers).toEqual({});

      expect(res).toEqual({
        message: "Uploaded successfully",
        success: true,
        id: "diag-abc-123",
      });
    });

    it("attaches cf-turnstile-response header when token is provided", async () => {
      const mockPost = vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({
          message: "Uploaded",
          success: true,
          id: "diag-xyz",
        }),
      });
      vi.spyOn(api, "post").mockImplementation(mockPost);

      const { result } = renderHook(() => useUploadDiagram(), {
        wrapper: createQueryWrapper(),
      });

      const file = new File(["payload"], "diagram.bin", {
        type: "application/octet-stream",
      });

      await act(async () => {
        await result.current.mutateAsync({
          file,
          token: "turnstile-token-secret-123",
        });
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [, options] = mockPost.mock.calls[0];
      expect(options.headers).toEqual({
        "cf-turnstile-response": "turnstile-token-secret-123",
      });
    });

    it("handles mutation failure when api.post rejects", async () => {
      vi.spyOn(api, "post").mockImplementation(() => {
        throw new Error("500 Internal Server Error");
      });

      const { result } = renderHook(() => useUploadDiagram(), {
        wrapper: createQueryWrapper(),
      });

      await expect(
        result.current.mutateAsync({ file: new Blob([""]) }),
      ).rejects.toThrow("500 Internal Server Error");
    });
  });

  describe("useFetchDiagram", () => {
    it("is disabled and does not fetch when id is null", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const { result } = renderHook(() => useFetchDiagram(null), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches diagram blob when valid id is provided", async () => {
      const expectedBlob = new Blob(["encrypted diagram content"]);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(expectedBlob, { status: 200 }));

      const { result } = renderHook(() => useFetchDiagram("diag-999"), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchSpy).toHaveBeenCalledWith(`${STORAGE_URL}/diag-999`);
      expect(result.current.data).toBeInstanceOf(Blob);
    });

    it("sets isError when storage response is not ok (e.g., 404)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 404, statusText: "Not Found" }),
      );

      const { result } = renderHook(() => useFetchDiagram("missing-id"), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain(
        "failed to fetch diagram: Not Found",
      );
    });
  });
});
