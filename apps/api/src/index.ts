import { Container, getContainer } from "@cloudflare/containers";
import { DEFAULT_CONTAINER_ID, PRODUCTION_ORIGIN } from "./constants";
import { ALLOWED_ROUTES } from "./routes.gen";

interface Env {
  MODE: string;
  RUST_LOG: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_ACCESS_KEY_SECRET: string;
  R2_DIAGRAMS_BUCKET_NAME: string;
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
}

export class ApiContainer extends Container<Env> {
  defaultPort = 5000;
  sleepAfter = "1m";
  override envVars: Record<string, string> = {
    MODE: this.env.MODE || "development",
    RUST_LOG: this.env.RUST_LOG || "info,tower_http=info",
    CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID,
    R2_ACCESS_KEY_SECRET: this.env.R2_ACCESS_KEY_SECRET,
    R2_DIAGRAMS_BUCKET_NAME: this.env.R2_DIAGRAMS_BUCKET_NAME,
  };
}

const ROUTE_MATCHERS = ALLOWED_ROUTES.map((route) => ({
  method: route.method,
  pattern: new URLPattern({ pathname: route.path }),
}));

function isKnownPath(url: string): boolean {
  return ROUTE_MATCHERS.some((route) => route.pattern.test(url));
}

function isAllowedRoute(method: string, url: string): boolean {
  return ROUTE_MATCHERS.some(
    (route) => route.method === method && route.pattern.test(url),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = request.url;

    // handle CORS preflight without booting the container
    if (request.method === "OPTIONS") {
      if (isKnownPath(url)) {
        const origin = request.headers.get("Origin") || "";
        const isProd = env.MODE === "production";
        const allowedOrigin = isProd ? PRODUCTION_ORIGIN : "*";

        // reject non-prod origins
        if (isProd && origin !== PRODUCTION_ORIGIN) {
          return new Response(null, { status: 403 });
        }

        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods":
              "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    }

    // filter out bots / invalid requests without booting up the container
    if (!isAllowedRoute(request.method, url)) {
      if (isKnownPath(url)) {
        return new Response("Method Not Allowed", { status: 405 });
      }
      return new Response("Not Found", { status: 404 });
    }

    const containerInstance = getContainer(
      env.API_CONTAINER,
      DEFAULT_CONTAINER_ID,
    );
    return containerInstance.fetch(request);
  },
};
