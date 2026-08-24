CREATE TABLE "gateway_client_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_last4" text NOT NULL,
	"secret_hash" text NOT NULL,
	"hash_algorithm" text DEFAULT 'hmac-sha256' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gateway_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"harness_profile_id" text NOT NULL,
	"name" text NOT NULL,
	"allowed_protocols" text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harness_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"allowed_protocols" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endpoint_credentials" (
	"endpoint_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "endpoint_credentials_endpoint_id_credential_id_pk" PRIMARY KEY("endpoint_id","credential_id")
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"billing_mode" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"secret_key_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"masked_display" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"preset_kind" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_model_bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"endpoint_id" text NOT NULL,
	"upstream_model_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "providers" ("id", "slug", "name", "preset_kind", "status", "created_at", "updated_at")
SELECT
	'legacy-provider-' || md5("provider"),
	"provider",
	"provider",
	'custom',
	'active',
	min("created_at"),
	max("updated_at")
FROM "connections"
GROUP BY "provider"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "harness_profiles" ("id", "slug", "name", "allowed_protocols") VALUES
	('profile-generic-openai-chat', 'generic-openai-chat', '通用 OpenAI Chat', ARRAY['openai-chat']::text[]),
	('profile-codex', 'codex', 'Codex', ARRAY['openai-responses']::text[]),
	('profile-claude-code', 'claude-code', 'Claude Code', ARRAY['anthropic-messages']::text[])
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "connections" RENAME TO "upstream_endpoints";--> statement-breakpoint
DROP INDEX "connections_name_unq";--> statement-breakpoint
DROP INDEX "connections_protocol_base_url_unq";--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD COLUMN "request_path" text;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD COLUMN "auth_scheme" text DEFAULT 'bearer' NOT NULL;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD COLUMN "supports_streaming" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "upstream_endpoints" SET
	"provider_id" = 'legacy-provider-' || md5("provider"),
	"request_path" = CASE "protocol"
		WHEN 'openai-chat' THEN '/v1/chat/completions'
		WHEN 'openai-responses' THEN '/v1/responses'
		WHEN 'anthropic-messages' THEN '/v1/messages'
		ELSE '/'
	END,
	"status" = CASE WHEN "enabled" THEN 'active' ELSE 'disabled' END;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ALTER COLUMN "provider_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ALTER COLUMN "request_path" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gateway_client_keys" ADD CONSTRAINT "gateway_client_keys_client_id_gateway_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."gateway_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_clients" ADD CONSTRAINT "gateway_clients_harness_profile_id_harness_profiles_id_fk" FOREIGN KEY ("harness_profile_id") REFERENCES "public"."harness_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_credentials" ADD CONSTRAINT "endpoint_credentials_endpoint_id_upstream_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."upstream_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_credentials" ADD CONSTRAINT "endpoint_credentials_credential_id_provider_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."provider_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_account_id_provider_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_model_bindings" ADD CONSTRAINT "provider_model_bindings_endpoint_id_upstream_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."upstream_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_client_keys_hash_unq" ON "gateway_client_keys" USING btree ("secret_hash");--> statement-breakpoint
CREATE INDEX "gateway_client_keys_prefix_idx" ON "gateway_client_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "gateway_client_keys_client_id_idx" ON "gateway_client_keys" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "gateway_client_keys_status_idx" ON "gateway_client_keys" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_clients_name_unq" ON "gateway_clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "gateway_clients_harness_profile_id_idx" ON "gateway_clients" USING btree ("harness_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "harness_profiles_slug_unq" ON "harness_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "endpoint_credentials_credential_id_idx" ON "endpoint_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_provider_name_unq" ON "provider_accounts" USING btree ("provider_id","name");--> statement-breakpoint
CREATE INDEX "provider_accounts_provider_id_idx" ON "provider_accounts" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_credentials_fingerprint_unq" ON "provider_credentials" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_credentials_account_name_unq" ON "provider_credentials" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "provider_credentials_account_id_idx" ON "provider_credentials" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "provider_credentials_status_idx" ON "provider_credentials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_slug_unq" ON "providers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_name_unq" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_model_bindings_endpoint_model_unq" ON "provider_model_bindings" USING btree ("endpoint_id","upstream_model_id");--> statement-breakpoint
CREATE INDEX "provider_model_bindings_endpoint_id_idx" ON "provider_model_bindings" USING btree ("endpoint_id");--> statement-breakpoint
ALTER TABLE "upstream_endpoints" ADD CONSTRAINT "upstream_endpoints_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "upstream_endpoints_provider_name_unq" ON "upstream_endpoints" USING btree ("provider_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "upstream_endpoints_protocol_url_unq" ON "upstream_endpoints" USING btree ("protocol","base_url","request_path");--> statement-breakpoint
CREATE INDEX "upstream_endpoints_provider_id_idx" ON "upstream_endpoints" USING btree ("provider_id");--> statement-breakpoint
ALTER TABLE "upstream_endpoints" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "upstream_endpoints" DROP COLUMN "enabled";
