// auto-generated from axum api router via utoipa. don't edit manually.

export interface RouteDef {
method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
path: string;
}

export const ALLOWED_ROUTES: readonly RouteDef[] = [
  { method: "GET", path: "/" },
  { method: "POST", path: "/diagram/upload" },
] as const;
