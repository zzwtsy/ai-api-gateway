import { createRouter } from "../../http/create-router.js";
import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createRouter()
  .openapi(routes.listHarnessProfilesRoute, handlers.listHarnessProfilesHandler)
  .openapi(routes.listGatewayClientsRoute, handlers.listGatewayClientsHandler)
  .openapi(routes.createGatewayClientRoute, handlers.createGatewayClientHandler)
  .openapi(routes.rotateGatewayClientKeyRoute, handlers.rotateGatewayClientKeyHandler)
  .openapi(routes.revokeGatewayClientKeyRoute, handlers.revokeGatewayClientKeyHandler);
