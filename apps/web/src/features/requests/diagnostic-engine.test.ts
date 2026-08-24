import type { components } from "@/api/schema";
import { describe, expect, it } from "vitest";
import { diagnoseRequest } from "./diagnostic-engine";

type RequestDetail = components["schemas"]["GatewayRequestDetail"];

const baseDetail: RequestDetail = {
  id: "req_01",
  clientId: "client_01",
  protocol: "openai-chat",
  requestedModel: "gpt-4o",
  upstreamModel: "gpt-4o",
  routingSnapshotVersion: 1,
  stream: true,
  outcome: "succeeded",
  statusCode: 200,
  startedAt: "2026-08-24T08:00:00.000Z",
  finishedAt: "2026-08-24T08:00:00.850Z",
  latencyMs: 850,
  ttftMs: 220,
  observationStatus: "complete",
  observedBytes: 1024,
  attempts: [{
    id: "att_01",
    requestId: "req_01",
    sequence: 1,
    connectionId: "conn_01",
    credentialId: "cred_01",
    upstreamModel: "gpt-4o",
    outcome: "succeeded",
    statusCode: 200,
    startedAt: "2026-08-24T08:00:00.000Z",
    finishedAt: "2026-08-24T08:00:00.850Z",
    errorCode: null,
    fallbackReason: null,
  }],
};

describe("diagnostic engine", () => {
  it("diagnoses single-attempt direct success", () => {
    const diag = diagnoseRequest(baseDetail);
    expect(diag.title).toBe("请求执行正常");
    expect(diag.tone).toBe("success");
    expect(diag.description).toContain("220 ms");
  });

  it("diagnoses fallback success across multiple attempts", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      attempts: [
        {
          id: "att_01",
          requestId: "req_01",
          sequence: 1,
          connectionId: "conn_01",
          credentialId: "cred_01",
          upstreamModel: "gpt-4o",
          outcome: "failed",
          statusCode: 429,
          startedAt: "2026-08-24T08:00:00.000Z",
          finishedAt: "2026-08-24T08:00:00.100Z",
          errorCode: "rate_limited",
          fallbackReason: "rate_limited",
        },
        {
          id: "att_02",
          requestId: "req_01",
          sequence: 2,
          connectionId: "conn_02",
          credentialId: "cred_02",
          upstreamModel: "gpt-4o",
          outcome: "succeeded",
          statusCode: 200,
          startedAt: "2026-08-24T08:00:00.100Z",
          finishedAt: "2026-08-24T08:00:00.900Z",
          errorCode: null,
          fallbackReason: null,
        },
      ],
    });
    expect(diag.title).toBe("请求已通过备用目标成功完成");
    expect(diag.tone).toBe("warning");
  });

  it("diagnoses 401 authentication failure", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      outcome: "failed",
      attempts: [{
        ...baseDetail.attempts[0]!,
        outcome: "failed",
        statusCode: 401,
      }],
    });
    expect(diag.title).toContain("鉴权失败");
    expect(diag.tone).toBe("danger");
    expect(diag.actionLink).toBe("/connections");
    expect(diag.actionConnectionId).toBe("conn_01");
  });

  it("diagnoses 429 rate limit failure", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      outcome: "failed",
      attempts: [{
        ...baseDetail.attempts[0]!,
        outcome: "failed",
        statusCode: 429,
      }],
    });
    expect(diag.title).toContain("限流或额度耗尽");
    expect(diag.tone).toBe("danger");
  });

  it("diagnoses 404 model not found", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      outcome: "failed",
      attempts: [{
        ...baseDetail.attempts[0]!,
        outcome: "failed",
        statusCode: 404,
      }],
    });
    expect(diag.title).toContain("模型不存在");
    expect(diag.actionLink).toBe("/models");
  });

  it("does not invent a failure when multiple successful attempts are recorded", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      attempts: [
        baseDetail.attempts[0]!,
        {
          ...baseDetail.attempts[0]!,
          id: "att_02",
          sequence: 2,
        },
      ],
    });

    expect(diag.title).toBe("请求已通过多次上游尝试完成");
    expect(diag.description).toContain("未记录失败尝试");
    expect(diag.description).not.toContain("故障");
  });

  it("keeps an unclassified failure conservative without claiming a timeout", () => {
    const diag = diagnoseRequest({
      ...baseDetail,
      outcome: "failed",
      statusCode: null,
      attempts: [{
        ...baseDetail.attempts[0]!,
        outcome: "failed",
        statusCode: null,
        errorCode: "UPSTREAM_REQUEST_FAILED",
      }],
    });

    expect(diag.title).toBe("连接或上游请求失败");
    expect(diag.description).not.toContain("超时");
    expect(diag.actionConnectionId).toBe("conn_01");
  });
});
