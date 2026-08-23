import { createRouter } from "../../http/create-router.js";
import { healthHandler } from "./handlers.js";
import { healthRoute } from "./routes.js";

export default createRouter().openapi(healthRoute, healthHandler);
