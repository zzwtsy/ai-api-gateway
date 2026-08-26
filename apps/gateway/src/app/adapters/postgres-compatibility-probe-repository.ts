import type {
  CompatibilityFactRecord,
  CompatibilityProbeCheck,
  CompatibilityProbeRepository,
  CompatibilityProbeRunRecord,
  CompatibilityProfileRecord,
  CompatibilityProfileStatus,
  CompatibilitySupportLevel,
  CreateCompatibilityProbeRunCommand,
} from "../../control-plane/features/connections/contracts.js";
import type { Database } from "../../db/client.js";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  compatibilityFacts,
  compatibilityProbeRuns,
  compatibilityProfiles,
} from "../../db/schema/index.js";
import { createQueuedCompatibilityProbeRun } from "./compatibility-probe-record.js";

export class PostgresCompatibilityProbeRepository implements CompatibilityProbeRepository {
  public constructor(private readonly db: Database) {}

  public async createRun(command: CreateCompatibilityProbeRunCommand) {
    return this.db.transaction(async (tx) => {
      await tx.insert(compatibilityProfiles).values({
        id: command.profileId,
        connectionId: command.connectionId,
        endpointId: command.endpointId,
        harnessProfileId: command.harnessProfileId,
        status: "unverified",
        createdAt: command.now,
        updatedAt: command.now,
      }).onConflictDoNothing();
      const [profile] = await tx.select().from(compatibilityProfiles).where(and(
        eq(compatibilityProfiles.endpointId, command.endpointId),
        eq(compatibilityProfiles.harnessProfileId, command.harnessProfileId),
      )).limit(1);
      if (profile === undefined)
        throw new Error("Compatibility profile was not available after upsert.");

      const [existing] = await tx.select().from(compatibilityProbeRuns).where(activeRunWhere(command)).limit(1);
      if (existing !== undefined)
        return { run: toRun(existing), created: false };

      const [created] = await tx.insert(compatibilityProbeRuns)
        .values(createQueuedCompatibilityProbeRun(command, profile.id))
        .onConflictDoNothing()
        .returning();
      if (created !== undefined)
        return { run: toRun(created), created: true };

      const [active] = await tx.select().from(compatibilityProbeRuns).where(activeRunWhere(command)).limit(1);
      if (active === undefined)
        throw new Error("Compatibility probe run conflicted without an active owner.");
      return { run: toRun(active), created: false };
    });
  }

  public async listByConnection(connectionId: string) {
    const [profileRows, factRows, runRows] = await Promise.all([
      this.db.select().from(compatibilityProfiles).where(eq(compatibilityProfiles.connectionId, connectionId)),
      this.db.select({
        profileId: compatibilityFacts.profileId,
        featureKey: compatibilityFacts.featureKey,
        supportLevel: compatibilityFacts.supportLevel,
        evidenceSource: compatibilityFacts.evidenceSource,
        evidenceRef: compatibilityFacts.evidenceRef,
        verifiedModelId: compatibilityFacts.verifiedModelId,
        verifiedAt: compatibilityFacts.verifiedAt,
        notes: compatibilityFacts.notes,
      }).from(compatibilityFacts).innerJoin(
        compatibilityProfiles,
        eq(compatibilityFacts.profileId, compatibilityProfiles.id),
      ).where(eq(compatibilityProfiles.connectionId, connectionId)).orderBy(desc(compatibilityFacts.verifiedAt)),
      this.db.select().from(compatibilityProbeRuns).where(eq(compatibilityProbeRuns.connectionId, connectionId)).orderBy(
        desc(compatibilityProbeRuns.createdAt),
      ).limit(50),
    ]);
    return {
      profiles: profileRows.map(toProfile),
      facts: factRows.map(row => ({
        ...row,
        supportLevel: row.supportLevel as CompatibilitySupportLevel,
        evidenceSource: row.evidenceSource as CompatibilityFactRecord["evidenceSource"],
      })),
      runs: runRows.map(toRun),
    };
  }

  public async claimRun(runId: string, now: Date) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.update(compatibilityProbeRuns).set({
        status: "running",
        startedAt: now,
        updatedAt: now,
      }).where(and(
        eq(compatibilityProbeRuns.id, runId),
        eq(compatibilityProbeRuns.status, "queued"),
      )).returning();
      return row === undefined ? null : toRun(row);
    });
  }

  public async recordCheck(command: Parameters<CompatibilityProbeRepository["recordCheck"]>[0]) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx.select().from(compatibilityProbeRuns).where(and(
        eq(compatibilityProbeRuns.id, command.runId),
        eq(compatibilityProbeRuns.status, "running"),
      )).limit(1);
      if (run === undefined)
        return null;
      for (const fact of command.facts) {
        await tx.insert(compatibilityFacts).values({
          profileId: run.profileId,
          featureKey: fact.featureKey,
          supportLevel: fact.supportLevel,
          evidenceSource: "probed",
          evidenceRef: run.id,
          verifiedModelId: run.model,
          verifiedAt: command.now,
          notes: fact.notes,
          createdAt: command.now,
          updatedAt: command.now,
        }).onConflictDoUpdate({
          target: [
            compatibilityFacts.profileId,
            compatibilityFacts.featureKey,
            compatibilityFacts.verifiedModelId,
          ],
          set: {
            supportLevel: fact.supportLevel,
            evidenceSource: "probed",
            evidenceRef: run.id,
            verifiedAt: command.now,
            notes: fact.notes,
            updatedAt: command.now,
          },
        });
      }
      const [updated] = await tx.update(compatibilityProbeRuns).set({
        completedChecks: command.completedChecks,
        currentCheck: command.nextCheck,
        updatedAt: command.now,
      }).where(eq(compatibilityProbeRuns.id, run.id)).returning();
      return updated === undefined ? null : toRun(updated);
    });
  }

  public async completeRun(command: Parameters<CompatibilityProbeRepository["completeRun"]>[0]) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx.update(compatibilityProbeRuns).set({
        status: "succeeded",
        currentCheck: null,
        completedChecks: sql`${compatibilityProbeRuns.totalChecks}`,
        completedAt: command.now,
        updatedAt: command.now,
      }).where(and(
        eq(compatibilityProbeRuns.id, command.runId),
        eq(compatibilityProbeRuns.status, "running"),
      )).returning();
      if (run === undefined)
        return null;
      await tx.update(compatibilityProfiles).set({
        status: command.profileStatus,
        lastProbeAt: command.now,
        summary: command.summary,
        updatedAt: command.now,
      }).where(eq(compatibilityProfiles.id, run.profileId));
      return toRun(run);
    });
  }

  public async failRun(runId: string, errorMessage: string, now: Date) {
    const [row] = await this.db.update(compatibilityProbeRuns).set({
      status: "failed",
      currentCheck: null,
      errorMessage,
      completedAt: now,
      updatedAt: now,
    }).where(and(
      eq(compatibilityProbeRuns.id, runId),
      inArray(compatibilityProbeRuns.status, ["queued", "running"]),
    )).returning();
    return row === undefined ? null : toRun(row);
  }

  public async invalidateForEndpoint(endpointId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(compatibilityFacts).where(sql`${compatibilityFacts.profileId} in (
        select ${compatibilityProfiles.id} from ${compatibilityProfiles}
        where ${compatibilityProfiles.endpointId} = ${endpointId}
      )`);
      await tx.update(compatibilityProfiles).set({
        status: "unverified",
        lastProbeAt: null,
        summary: null,
        updatedAt: now,
      }).where(eq(compatibilityProfiles.endpointId, endpointId));
    });
  }

  public async deleteForEndpoint(endpointId: string): Promise<void> {
    await this.db.delete(compatibilityProfiles).where(eq(compatibilityProfiles.endpointId, endpointId));
  }
}

function activeRunWhere(command: CreateCompatibilityProbeRunCommand) {
  return and(
    eq(compatibilityProbeRuns.endpointId, command.endpointId),
    eq(compatibilityProbeRuns.credentialId, command.credentialId),
    eq(compatibilityProbeRuns.model, command.model),
    inArray(compatibilityProbeRuns.status, ["queued", "running"]),
  );
}

function toRun(row: typeof compatibilityProbeRuns.$inferSelect): CompatibilityProbeRunRecord {
  return {
    ...row,
    checks: row.checks as CompatibilityProbeCheck[],
    status: row.status as CompatibilityProbeRunRecord["status"],
    currentCheck: row.currentCheck as CompatibilityProbeCheck | null,
  };
}

function toProfile(row: typeof compatibilityProfiles.$inferSelect): CompatibilityProfileRecord {
  return {
    id: row.id,
    connectionId: row.connectionId,
    endpointId: row.endpointId,
    harnessProfileId: row.harnessProfileId,
    status: row.status as CompatibilityProfileStatus,
    lastProbeAt: row.lastProbeAt,
    summary: row.summary,
  };
}
