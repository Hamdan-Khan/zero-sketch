import { STORAGE_URL } from "@/lib/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Options } from "ky";
import { api } from "./api";

// todo: set up type gen package like ts-rs for axum api types
type UploadResponse = { message: string; success: boolean; id: string };

export function useUploadDiagram() {
  return useMutation({
    mutationFn: async (data: { file: Blob | File; token?: string | null }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      const headers: Options["headers"] = {};
      if (data.token) {
        headers["cf-turnstile-response"] = data.token;
      }
      return api
        .post("diagram/upload", {
          body: formData,
          headers,
        })
        .json<UploadResponse>();
    },
  });
}

export function useFetchDiagram(id: string | null) {
  return useQuery({
    queryKey: ["diagram", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("diagram id is required");
      }
      const res = await fetch(`${STORAGE_URL}/${id}`);
      if (!res.ok) {
        throw new Error(`failed to fetch diagram: ${res.statusText}`);
      }
      return await res.blob();
    },
    enabled: Boolean(id),
    // a diagram once uploaded as a share link, never changes
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
