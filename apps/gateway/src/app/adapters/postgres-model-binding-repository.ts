import type { ModelBindingRepository, ProviderModelBindingRecord } from "../../control-plane/features/models/contracts.js";
import type { Database } from "../../db/client.js";
import { asc, eq } from "drizzle-orm";
import { AppError } from "../../core/errors/app-error.js";
import { providerModelBindings, upstreamEndpoints } from "../../db/schema/index.js";

export class PostgresModelBindingRepository implements ModelBindingRepository {
  public constructor(private readonly db: Database) {}
  public async list(): Promise<readonly ProviderModelBindingRecord[]> {
    return (await this.db.select().from(providerModelBindings).orderBy(asc(providerModelBindings.createdAt)))
      .map(row => ({ ...row, status: row.status as ProviderModelBindingRecord["status"] }));
  }

  public async endpointExists(endpointId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: upstreamEndpoints.id }).from(upstreamEndpoints).where(eq(upstreamEndpoints.id, endpointId)).limit(1);
    return row !== undefined;
  }

  public async create(record: ProviderModelBindingRecord) {
    try {
      const [created] = await this.db.insert(providerModelBindings).values(record).returning();
      if (created === undefined)
        throw new Error("Model binding insert returned no row.");
      return { ...created, status: created.status as ProviderModelBindingRecord["status"] };
    } catch (error) {
      if (isUniqueViolation(error))
        throw new AppError("MODEL_BINDING_CONFLICT", undefined, { cause: error });
      throw error;
    }
  }
}
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null)
    return false;
  if ("code" in error && error.code === "23505")
    return true;
  return "cause" in error && isUniqueViolation(error.cause);
}
