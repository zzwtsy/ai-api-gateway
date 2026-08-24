import clientsRouter from "./features/clients/index.js";
import connectionsRouter from "./features/connections/index.js";
import healthRouter from "./features/health/index.js";
import modelsRouter from "./features/models/index.js";
import requestsRouter from "./features/requests/index.js";
import { createRouter } from "./http/create-router.js";

export function createControlPlane() {
  return createRouter()
    .route("/", healthRouter)
    .route("/", clientsRouter)
    .route("/", connectionsRouter)
    .route("/", modelsRouter)
    .route("/", requestsRouter);
}
