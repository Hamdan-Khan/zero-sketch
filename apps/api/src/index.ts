import { Container, getContainer } from "@cloudflare/containers";

export class ApiContainer extends Container {
  defaultPort = 5000;
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
