import type { GetRequestRoute, ListRequestsRoute } from "./routes.js";

import type { AppRouteHandler } from "../../http/context.js";
import { successResponse } from "../../http/response.js";
import type { GatewayAttemptRecord, GatewayRequestRecord, RequestWithAttempts } from "../../../core/requests/contracts.js";
import type { RequestDetailView, RequestView } from "./schemas.js";
import { RequestQueryService } from "./service.js";

export const listRequestsHandler: AppRouteHandler<ListRequestsRoute> = async (c) => {
  const service = new RequestQueryService(c.get("controlDependencies").requestStore);
  const { limit } = c.req.valid("query");
  return successResponse(c, (await service.list(limit)).map(toRequestView));
};

export const getRequestHandler: AppRouteHandler<GetRequestRoute> = async (c) => {
  const service = new RequestQueryService(c.get("controlDependencies").requestStore);
  const { requestId } = c.req.valid("param");
  return successResponse(c, toRequestDetailView(await service.getById(requestId)));
};

function toRequestView(item: GatewayRequestRecord): RequestView {
  return {
    ...item,
    startedAt: item.startedAt.toISOString(),
    finishedAt: item.finishedAt?.toISOString() ?? null,
  };
}

function toAttemptView(item: GatewayAttemptRecord): RequestDetailView["attempts"][number] {
  return {
    ...item,
    startedAt: item.startedAt.toISOString(),
    finishedAt: item.finishedAt?.toISOString() ?? null,
  };
}

function toRequestDetailView(item: RequestWithAttempts): RequestDetailView {
  return {
    ...toRequestView(item),
    attempts: item.attempts.map(toAttemptView),
  };
}
