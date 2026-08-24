import { createRouter } from "../../http/create-router.js";
import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createRouter().openapi(routes.listProviderModelBindingsRoute, handlers.listProviderModelBindingsHandler).openapi(routes.createProviderModelBindingRoute, handlers.createProviderModelBindingHandler);
