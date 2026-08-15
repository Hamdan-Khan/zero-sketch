import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  MODE: string;
  RUST_LOG: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_ACCESS_KEY_SECRET: string;
  R2_DIAGRAMS_BUCKET_NAME: string;
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
}

export class ApiContainer extends Container<Env> {
  defaultPort = 5000;
  sleepAfter = "1m";
  envVars = {
    MODE: this.env.MODE || "development",
    RUST_LOG: this.env.RUST_LOG || "info,tower_http=info",
    R2_ACCOUNT_ID: this.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID,
    R2_ACCESS_KEY_SECRET: this.env.R2_ACCESS_KEY_SECRET,
    R2_DIAGRAMS_BUCKET_NAME: this.env.R2_DIAGRAMS_BUCKET_NAME,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const containerInstance = getContainer(
      env.API_CONTAINER,
      "zerosketch-default",
    );
    return containerInstance.fetch(request);
  },
};
