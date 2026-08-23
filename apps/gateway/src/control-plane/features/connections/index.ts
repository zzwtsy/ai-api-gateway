import { createRouter } from "../../http/create-router.js";
import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createRouter()
  .openapi(routes.listConnectionsRoute, handlers.listConnectionsHandler)
  .openapi(routes.getConnectionRoute, handlers.getConnectionHandler)
  .openapi(routes.createConnectionRoute, handlers.createConnectionHandler);
