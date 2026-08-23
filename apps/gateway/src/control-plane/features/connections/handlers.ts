import type { AppRouteHandler } from "../../http/context.js";

import type { ConnectionRecord } from "./contracts.js";
import type {
  CreateConnectionRoute,
  GetConnectionRoute,
  ListConnectionsRoute,
} from "./routes.js";
import type { ConnectionView } from "./schemas.js";
import { successResponse } from "../../http/response.js";
import { ConnectionService } from "./service.js";

export const listConnectionsHandler: AppRouteHandler<ListConnectionsRoute> = async (c) => {
  const service = new ConnectionService(c.get("controlDependencies").connectionRepository);
  const items = await service.list();
  return successResponse(c, items.map(toView));
};

export const getConnectionHandler: AppRouteHandler<GetConnectionRoute> = async (c) => {
  const service = new ConnectionService(c.get("controlDependencies").connectionRepository);
  const { connectionId } = c.req.valid("param");
  return successResponse(c, toView(await service.getById(connectionId)));
};

export const createConnectionHandler: AppRouteHandler<CreateConnectionRoute> = async (c) => {
  const service = new ConnectionService(c.get("controlDependencies").connectionRepository);
  const item = await service.create(c.req.valid("json"));
  return successResponse(c, toView(item), { status: 201 });
};

function toView(item: ConnectionRecord): ConnectionView {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
