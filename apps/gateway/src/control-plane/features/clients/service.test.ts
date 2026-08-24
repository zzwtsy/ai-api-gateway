import { describe, expect, it } from "vitest";
import { MemoryGatewayClientRepository } from "../../../app/adapters/memory-gateway-client-repository.js";
import { GatewayClientService } from "./service.js";

describe("GatewayClientService", () => {
  it("returns the full Key once while the Repository retains only safe metadata", async () => {
    const repository = new MemoryGatewayClientRepository();
    const service = new GatewayClientService(repository, "gateway-pepper-for-client-test", { now: () => new Date("2026-08-23T00:00:00.000Z") });
    const result = await service.create({ name: "测试客户端", profileSlug: "generic-openai-chat", allowedProtocols: ["openai-chat"] });
    expect(result.key).toMatch(/^gw_generic-openai-chat_/);
    expect(JSON.stringify(await repository.list())).not.toContain(result.key);
    expect(result.client.keys[0]).toMatchObject({ status: "active", keyLast4: result.key.slice(-4) });
  });
});
