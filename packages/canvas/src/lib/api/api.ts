import ky from "ky";

/** api client */
export const api = ky.create({
  baseUrl: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000",
});
