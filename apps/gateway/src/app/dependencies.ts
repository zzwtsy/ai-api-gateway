import type { ControlPlaneDependencies } from "../control-plane/dependencies.js";
import type { AppLogger } from "../core/logging/logger.js";
import type { DataPlaneDependencies } from "../data-plane/dependencies.js";

export interface ApplicationDependencies extends ControlPlaneDependencies, DataPlaneDependencies {
  readonly logger: AppLogger;
}
