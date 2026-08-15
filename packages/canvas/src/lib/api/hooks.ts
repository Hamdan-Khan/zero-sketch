import { useMutation } from "@tanstack/react-query";
import { api } from "./api";

// todo: set up type gen package like ts-rs for axum api types
type UploadResponse = { message: string; success: boolean; id: string };

export function useUploadDiagram() {
  return useMutation({
    mutationFn: async (data: { file: Blob | File; id: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("id", data.id);
      return api.post("upload", { body: formData }).json<UploadResponse>();
    },
  });
}
