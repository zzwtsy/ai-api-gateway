import type { ControlAuth } from "./contracts.js";

export const unavailableControlAuth: ControlAuth = {
  handler: async () => Response.json(
    { error: "Better Auth 控制面认证要求使用 PostgreSQL 存储。" },
    { status: 503 },
  ),
  getSession: async () => null,
  signUpEmail: async () => {
    throw new Error("Better Auth is unavailable with memory storage");
  },
};
