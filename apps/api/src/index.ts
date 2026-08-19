import {
  Container,
  ContainerProxy,
  getContainer,
} from "@cloudflare/containers";
import {
  DEFAULT_CONTAINER_ID,
  PRODUCTION_ORIGIN,
  TURNSTILE_SITE_VERIFY_URL,
} from "./constants";
import { ALLOWED_ROUTES } from "./routes.gen";

export { ContainerProxy };

interface Env {
  MODE: string;
  RUST_LOG: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_ACCESS_KEY_SECRET: string;
  R2_DIAGRAMS_BUCKET_NAME: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_HOSTNAMES?: string;
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

    const isProd = env.MODE === "production";
    const allowedOrigin = isProd ? PRODUCTION_ORIGIN : "*";

    // handle CORS preflight without booting the container
    if (request.method === "OPTIONS") {
      if (isKnownPath(url)) {
        const origin = request.headers.get("Origin") || "";

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

    // siteverify for diagram upload endpoint
    const urlObj = new URL(url);
    if (request.method === "POST" && urlObj.pathname === "/diagram/upload") {
      const turnstileSecret = env.TURNSTILE_SECRET_KEY;
      if (turnstileSecret) {
        // get the bot verification token from the req header
        const token = request.headers.get("cf-turnstile-response");
        const forbiddenResponseInit: ResponseInit = {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigin,
          },
        };

        // validate the token format
        if (!token || typeof token !== "string" || token.length > 2048) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Missing or invalid bot verification token",
            }),
            forbiddenResponseInit,
          );
        }

        const clientIp = request.headers.get("CF-Connecting-IP") || "";
        const expectedAction = "share_diagram";
        const expectedHostnames = new Set(
          (env.TURNSTILE_HOSTNAMES ?? "localhost,127.0.0.1")
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
        );

        try {
          const siteverifyRes = await fetch(TURNSTILE_SITE_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            signal: AbortSignal.timeout(10_000),
            body: new URLSearchParams({
              secret: turnstileSecret,
              response: token,
              remoteip: clientIp,
            }),
          });

          if (!siteverifyRes.ok) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Bot verification service unavailable",
              }),
              forbiddenResponseInit,
            );
          }

          const outcome: {
            success: boolean;
            action?: string;
            hostname?: string;
            "error-codes"?: string[];
          } = await siteverifyRes.json();

          // validate the siteverify response
          if (
            !outcome.success ||
            (outcome.action && outcome.action !== expectedAction) ||
            (outcome.hostname &&
              expectedHostnames.size > 0 &&
              !expectedHostnames.has(outcome.hostname))
          ) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Bot verification failed",
                errors: outcome["error-codes"],
              }),
              forbiddenResponseInit,
            );
          }
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Error validating bot verification token",
            }),
            forbiddenResponseInit,
          );
        }
      }
    }

    const containerInstance = getContainer(
      env.API_CONTAINER,
      DEFAULT_CONTAINER_ID,
    );
    return containerInstance.fetch(request);
  },
};
