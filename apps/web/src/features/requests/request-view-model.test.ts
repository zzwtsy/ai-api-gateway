// @vitest-environment node

import type { components } from "@/api/schema";

import { describe, expect, it } from "vitest";

import { toRequestDetailView, toRequestListItemView } from "./request-view-model";

type RequestDetail = components["schemas"]["GatewayRequestDetail"];

describe("request view model", () => {
  it("keeps zero distinct from missing latency", () => {
    const record = requestDetail({ latencyMs: null, ttftMs: 0 });

    expect(toRequestListItemView(record).ttftLabel).toBe("0 ms");
    expect(toRequestDetailView(record).facts).toEqual(expect.arrayContaining([
      { label: "总延迟", value: "—" },
      { label: "TTFT", value: "0 ms" },
    ]));
  });

  it.each([
    ["pending", "等待完成", "warning", true],
    ["complete", "完整", "success", false],
    ["incomplete", "不完整", "warning", true],
  ] as const)("maps %s observation without inferring a transport cause", (status, label, tone, partial) => {
    const view = toRequestDetailView(requestDetail({ observationStatus: status }));

    expect(view.observation).toMatchObject({ status, label, tone });
    expect(view.partial).toBe(partial);
  });

  it("maps every Attempt outcome and preserves the server sequence", () => {
    const view = toRequestDetailView(requestDetail({
      attempts: [
        attempt(4, "client_cancelled", null),
        attempt(1, "running", null),
        attempt(2, "succeeded", 200),
        attempt(3, "failed", 503),
      ],
    }));

    expect(view.attempts.map(item => [item.sequence, item.outcomeLabel, item.tone, item.statusCodeLabel]))
      .toEqual([
        [4, "客户端已取消", "warning", "—"],
        [1, "进行中", "neutral", "—"],
        [2, "成功", "success", "200"],
        [3, "失败", "danger", "503"],
      ]);
  });
});

function requestDetail(overrides: Partial<RequestDetail> = {}): RequestDetail {
  return {
    id: "req_01",
    clientId: "client_01",
    protocol: "openai-chat",
    requestedModel: "deepseek-chat",
    upstreamModel: "deepseek-chat",
    routingSnapshotVersion: 1,
    stream: true,
    outcome: "succeeded",
    statusCode: 200,
    startedAt: "2026-08-23T08:00:00.000Z",
    finishedAt: "2026-08-23T08:00:01.000Z",
    latencyMs: 1000,
    ttftMs: 120,
    observationStatus: "complete",
    observedBytes: 1234,
    attempts: [],
    ...overrides,
  };
}

function attempt(
  sequence: number,
  outcome: components["schemas"]["GatewayAttempt"]["outcome"],
  statusCode: number | null,
): components["schemas"]["GatewayAttempt"] {
  return {
    id: `attempt_${sequence}`,
    requestId: "req_01",
    sequence,
    connectionId: "conn_01",
    credentialId: "credential_01",
    upstreamModel: "deepseek-chat",
    outcome,
    statusCode,
    startedAt: "2026-08-23T08:00:00.000Z",
    finishedAt: null,
    errorCode: null,
    fallbackReason: null,
  };
}
