import { createRouter } from "../../http/create-router.js";
import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createRouter()
  .openapi(routes.listConnectionsRoute, handlers.listConnectionsHandler)
  .openapi(routes.getConnectionRoute, handlers.getConnectionHandler)
  .openapi(routes.createConnectionRoute, handlers.createConnectionHandler)
  .openapi(routes.addConnectionEndpointRoute, handlers.addConnectionEndpointHandler)
  .openapi(routes.rotateProviderCredentialRoute, handlers.rotateProviderCredentialHandler)
  .openapi(routes.disableProviderCredentialRoute, handlers.disableProviderCredentialHandler)
  .openapi(routes.probeProviderCredentialRoute, handlers.probeProviderCredentialHandler)
  .openapi(routes.probeEndpointRoute, handlers.probeEndpointHandler)
  .openapi(routes.discoverUpstreamModelsRoute, handlers.discoverUpstreamModelsHandler)
  .openapi(routes.getConnectionCompatibilityRoute, handlers.getConnectionCompatibilityHandler);
