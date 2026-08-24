import type { AppRouteHandler } from "../../http/context.js";
import type { ProviderModelBindingRecord } from "./contracts.js";
import type { CreateProviderModelBindingRoute, ListProviderModelBindingsRoute } from "./routes.js";
import type { ProviderModelBindingView } from "./schemas.js";
import { successResponse } from "../../http/response.js";
import { ModelBindingService } from "./service.js";

export const listProviderModelBindingsHandler: AppRouteHandler<ListProviderModelBindingsRoute> = async (c) => {
  const service = new ModelBindingService(c.get("controlDependencies").modelBindingRepository, c.get("controlDependencies").clock);
  return successResponse(c, (await service.list()).map(toView));
};
export const createProviderModelBindingHandler: AppRouteHandler<CreateProviderModelBindingRoute> = async (c) => {
  const service = new ModelBindingService(c.get("controlDependencies").modelBindingRepository, c.get("controlDependencies").clock);
  return successResponse(c, toView(await service.create(c.req.valid("json"))), { status: 201 });
};
function toView(record: ProviderModelBindingRecord): ProviderModelBindingView {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
