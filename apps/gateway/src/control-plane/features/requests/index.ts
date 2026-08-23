import { createRouter } from "../../http/create-router.js";
import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createRouter()
  .openapi(routes.listRequestsRoute, handlers.listRequestsHandler)
  .openapi(routes.getRequestRoute, handlers.getRequestHandler);
