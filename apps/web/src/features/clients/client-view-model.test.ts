import { describe, expect, it } from "vitest";

import { gatewayClientKeyStatusLabel, usableGatewayClientKeyCount } from "./client-view-model";

const now = Date.parse("2026-08-24T12:00:00.000Z");

describe("Gateway Client Key display state", () => {
  it("does not count an expired overlap Key as usable", () => {
    const expiredKey = keyFixture("expiring", "2026-08-24T11:00:00.000Z");
    const activeKey = keyFixture("active", null);
    const client = { keys: [expiredKey, activeKey] } as Parameters<typeof usableGatewayClientKeyCount>[0];

    expect(gatewayClientKeyStatusLabel(expiredKey, now)).toBe("已过期");
    expect(usableGatewayClientKeyCount(client, now)).toBe(1);
  });
});

function keyFixture(status: "active" | "expiring" | "revoked", expiresAt: string | null) {
  return {
    id: `${status}-key`,
    keyPrefix: "gw_test",
    keyLast4: "1234",
    status,
    expiresAt,
    lastUsedAt: null,
    createdAt: "2026-08-24T10:00:00.000Z",
    revokedAt: null,
  } as const;
}
