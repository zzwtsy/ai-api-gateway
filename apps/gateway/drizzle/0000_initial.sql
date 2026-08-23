CREATE TABLE IF NOT EXISTS "connections" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "provider" text NOT NULL,
  "protocol" text NOT NULL,
  "base_url" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connections_name_unq" ON "connections" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connections_protocol_base_url_unq" ON "connections" USING btree ("protocol", "base_url");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gateway_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "client_id" text NOT NULL,
  "protocol" text NOT NULL,
  "requested_model" text NOT NULL,
  "upstream_model" text NOT NULL,
  "routing_snapshot_version" integer NOT NULL,
  "stream" boolean NOT NULL,
  "outcome" text NOT NULL,
  "status_code" integer,
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone,
  "latency_ms" integer,
  "ttft_ms" integer,
  "observation_status" text NOT NULL,
  "observed_bytes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gateway_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL,
  "sequence" integer NOT NULL,
  "connection_id" text NOT NULL,
  "credential_id" text NOT NULL,
  "upstream_model" text NOT NULL,
  "outcome" text NOT NULL,
  "status_code" integer,
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone,
  "error_code" text,
  "fallback_reason" text,
  CONSTRAINT "gateway_attempts_request_id_gateway_requests_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."gateway_requests"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gateway_requests_started_at_idx" ON "gateway_requests" USING btree ("started_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gateway_attempts_request_id_idx" ON "gateway_attempts" USING btree ("request_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gateway_attempts_request_sequence_unq" ON "gateway_attempts" USING btree ("request_id", "sequence");
--> statement-breakpoint

-- Better Auth minimal PostgreSQL schema. Keep aligned with the configured Better Auth release.
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "emailVerified" boolean DEFAULT false NOT NULL,
  "image" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL,
  CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp with time zone,
  "refreshTokenExpiresAt" timestamp with time zone,
  "scope" text,
  "password" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_unq" ON "account" USING btree ("providerId", "accountId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
