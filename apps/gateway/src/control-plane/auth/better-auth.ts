import type { Pool } from "pg";

import { betterAuth } from "better-auth";

import type { Env } from "../../config/env-schema.js";
import type { ControlAuth } from "./contracts.js";

export function createBetterAuth(
  pool: Pool,
  env: Env,
  options: { readonly disableSignUp?: boolean } = {},
): ControlAuth {
  const auth = betterAuth({
    appName: "AI API Gateway",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      disableSignUp: options.disableSignUp ?? true,
    },
  });

  return {
    handler: (request) => auth.handler(request),
    getSession: async (headers) => {
      const session = await auth.api.getSession({ headers });
      if (session === null) {
        return null;
      }
      return {
        id: session.user.id,
        email: session.user.email,
      };
    },
    signUpEmail: async (input) => {
      await auth.api.signUpEmail({ body: input });
    },
  };
}
