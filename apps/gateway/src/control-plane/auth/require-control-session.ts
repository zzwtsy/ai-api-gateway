import { createMiddleware } from "hono/factory";

import type { ControlUser } from "./contracts.js";
import type { ControlEnv } from "../http/env.js";
import { AppError } from "../../core/errors/app-error.js";

export function requireControlSession() {
  return createMiddleware<ControlEnv>(async (c, next) => {
    const dependencies = c.get("controlDependencies");
    const developmentUser = resolveDevelopmentUser(
      dependencies.env.NODE_ENV,
      dependencies.env.DEV_ADMIN_TOKEN,
      c.req.header("authorization"),
    );
    if (developmentUser !== null) {
      c.set("controlUser", developmentUser);
      await next();
      return;
    }

    const sessionUser = await dependencies.controlAuth.getSession(c.req.raw.headers);
    if (sessionUser === null) {
      throw new AppError("COMMON_UNAUTHORIZED");
    }
    c.set("controlUser", {
      ...sessionUser,
      source: "better-auth",
    });
    await next();
  });
}

function resolveDevelopmentUser(
  nodeEnv: string,
  expectedToken: string,
  authorization: string | undefined,
): ControlUser | null {
  if (nodeEnv === "production" || authorization === undefined) {
    return null;
  }
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix) || authorization.slice(prefix.length) !== expectedToken) {
    return null;
  }
  return {
    id: "development-owner",
    email: "owner@example.com",
    source: "development-token",
  };
}
