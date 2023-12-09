import { BackendServer } from "../server";
import { ServerConfig } from "../types";

interface CFFunctionDefinition {
  serverConfig: ServerConfig;
  routeRegistrationFn: (server: BackendServer) => void;
}

export type CFFunctionHandler = (config: CFFunctionDefinition) => PagesFunction<{}>;

/** A Cloudflare Pages function handler configured with routes, a database connection, middleware, cors, and error handling OOTB. */
const functionHandler: CFFunctionHandler = (config: CFFunctionDefinition) => {
  const server = new BackendServer();
  let handler: (eventContext: EventContext<{}, any, {}>) => Response | Promise<Response>;

  return async (eventContext) => {
    if (!server.configured) {
      server.configure(config.serverConfig);

      config.routeRegistrationFn(server);
      handler = server.start();
    }

    return await handler(eventContext);
  };
};

export default functionHandler;