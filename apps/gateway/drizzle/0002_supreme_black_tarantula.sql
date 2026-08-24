CREATE TABLE "compatibility_facts" (
	"profile_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"support_level" text NOT NULL,
	"evidence_source" text NOT NULL,
	"evidence_ref" text NOT NULL,
	"verified_model_id" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compatibility_facts_profile_id_feature_key_verified_model_id_pk" PRIMARY KEY("profile_id","feature_key","verified_model_id")
);
--> statement-breakpoint
CREATE TABLE "compatibility_probe_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"harness_profile_id" text NOT NULL,
	"model" text NOT NULL,
	"checks" text[] NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_checks" integer NOT NULL,
	"completed_checks" integer DEFAULT 0 NOT NULL,
	"current_check" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compatibility_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"harness_profile_id" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"last_probe_at" timestamp with time zone,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compatibility_facts" ADD CONSTRAINT "compatibility_facts_profile_id_compatibility_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."compatibility_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_probe_runs" ADD CONSTRAINT "compatibility_probe_runs_profile_id_compatibility_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."compatibility_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_probe_runs" ADD CONSTRAINT "compatibility_probe_runs_connection_id_providers_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_probe_runs" ADD CONSTRAINT "compatibility_probe_runs_endpoint_id_upstream_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."upstream_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_probe_runs" ADD CONSTRAINT "compatibility_probe_runs_credential_id_provider_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."provider_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_probe_runs" ADD CONSTRAINT "compatibility_probe_runs_harness_profile_id_harness_profiles_id_fk" FOREIGN KEY ("harness_profile_id") REFERENCES "public"."harness_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_profiles" ADD CONSTRAINT "compatibility_profiles_connection_id_providers_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_profiles" ADD CONSTRAINT "compatibility_profiles_endpoint_id_upstream_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."upstream_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_profiles" ADD CONSTRAINT "compatibility_profiles_harness_profile_id_harness_profiles_id_fk" FOREIGN KEY ("harness_profile_id") REFERENCES "public"."harness_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compatibility_facts_profile_verified_idx" ON "compatibility_facts" USING btree ("profile_id","verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "compatibility_probe_runs_active_target_unq" ON "compatibility_probe_runs" USING btree ("endpoint_id","credential_id","model") WHERE "compatibility_probe_runs"."status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "compatibility_probe_runs_connection_created_idx" ON "compatibility_probe_runs" USING btree ("connection_id","created_at");--> statement-breakpoint
CREATE INDEX "compatibility_probe_runs_profile_created_idx" ON "compatibility_probe_runs" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "compatibility_profiles_endpoint_harness_unq" ON "compatibility_profiles" USING btree ("endpoint_id","harness_profile_id");--> statement-breakpoint
CREATE INDEX "compatibility_profiles_connection_id_idx" ON "compatibility_profiles" USING btree ("connection_id");