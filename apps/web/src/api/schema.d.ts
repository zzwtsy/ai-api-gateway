export interface paths {
    "/admin/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取健康状态
         * @description 返回控制面进程健康状态，不代表所有上游 Provider 可用。
         */
        get: operations["getControlPlaneHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/harness-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 列出 Harness 类型
         * @description 列出创建 Gateway Client 时可用的 Harness Profile。
         */
        get: operations["listHarnessProfiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 列出客户端
         * @description 列出 Gateway Client 与脱敏 Key 元数据。
         */
        get: operations["listGatewayClients"];
        put?: never;
        /**
         * 创建客户端
         * @description 创建 Gateway Client；完整 Key 只在本次响应返回。
         */
        post: operations["createGatewayClient"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/clients/{clientId}/keys/rotate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 轮换客户端 Key
         * @description 创建新 Key，并为旧 Key 设置有限重叠窗口。完整新 Key 只返回一次。
         */
        post: operations["rotateGatewayClientKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/client-keys/{keyId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 撤销客户端 Key
         * @description 立即撤销指定 Gateway Client Key。
         */
        post: operations["revokeGatewayClientKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/connections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 列出连接
         * @description 列出所有 Provider Endpoint 连接。
         */
        get: operations["listConnections"];
        put?: never;
        /**
         * 创建连接
         * @description 创建一个上游 Provider Endpoint；入口协议和目标协议必须保持一致。
         */
        post: operations["createConnection"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/connections/{connectionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取连接
         * @description 根据连接 ID 获取 Provider Endpoint 配置。
         */
        get: operations["getConnectionById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/connections/{connectionId}/endpoints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 添加上游 Endpoint
         * @description 为已有 Provider 添加一个协议明确的 Endpoint，并绑定同一 Provider 下的可用 Credential。
         */
        post: operations["addConnectionEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/provider-credentials/{credentialId}/rotate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 轮换上游凭据
         * @description 使用新的 Secret 替换 Provider Credential；完整 Secret 不会出现在响应中。
         */
        post: operations["rotateProviderCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/provider-credentials/{credentialId}/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 禁用上游凭据
         * @description 禁用 Provider Credential，使其不再参与后续上游请求。
         */
        post: operations["disableProviderCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/provider-credentials/{credentialId}/probe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 测试上游凭据
         * @description 显式使用指定 Endpoint、Credential 和模型发送最小上游请求。该操作可能产生 Provider 费用。
         */
        post: operations["probeProviderCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/endpoints/{endpointId}/probe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 执行 Endpoint 完整兼容性测试
         * @description 使用绑定的 Credential 和指定模型异步测试协议与 Harness 能力；该操作会发送多次真实上游请求并可能产生费用。
         */
        post: operations["probeEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/endpoints/{endpointId}/models/discover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 获取上游模型目录
         * @description 显式使用绑定的 Credential 请求 OpenAI-compatible 模型目录；完整 Secret 不会返回浏览器。
         */
        post: operations["discoverUpstreamModels"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/connections/{connectionId}/compatibility": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取连接兼容性事实
         * @description 返回连接下按 Endpoint、Harness Profile 和实测模型保存的兼容性事实与最近测试进度。
         */
        get: operations["getConnectionCompatibility"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 列出模型绑定
         * @description 列出 Endpoint 接受的最小上游模型绑定。
         */
        get: operations["listProviderModelBindings"];
        put?: never;
        /**
         * 创建模型绑定
         * @description 为指定 Endpoint 创建一个明确的上游模型 ID。
         */
        post: operations["createProviderModelBinding"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 列出请求
         * @description 列出逻辑请求；上游重试仍归属于同一逻辑请求。
         */
        get: operations["listGatewayRequests"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/api/v1/requests/{requestId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 获取请求详情
         * @description 返回一次逻辑请求及其完整上游尝试链。
         */
        get: operations["getGatewayRequestById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ResponseMeta: {
            /** @description 请求关联 ID */
            requestId: string;
        };
        HarnessProfile: {
            id: string;
            slug: string;
            name: string;
            allowedProtocols: ("openai-chat" | "openai-responses" | "anthropic-messages")[];
        };
        ErrorEnvelope: {
            /** @enum {boolean} */
            success: false;
            code: components["schemas"]["ErrorCode"];
            message: string;
            data: unknown;
            error: {
                /** @enum {string} */
                type: "business" | "validation" | "internal";
                details?: components["schemas"]["ErrorDetail"][];
            };
            meta: components["schemas"]["ResponseMeta"];
        };
        /** @enum {string} */
        ErrorCode: "COMMON_OK" | "COMMON_CREATED" | "COMMON_VALIDATION_FAILED" | "COMMON_UNAUTHORIZED" | "COMMON_NOT_FOUND" | "COMMON_CONFLICT" | "COMMON_INTERNAL_ERROR" | "CONNECTION_NOT_FOUND" | "CONNECTION_CONFLICT" | "CREDENTIAL_NOT_FOUND" | "CREDENTIAL_CONFLICT" | "CREDENTIAL_PROBE_TARGET_NOT_FOUND" | "CREDENTIAL_DISABLED" | "ENDPOINT_DISABLED" | "ENDPOINT_TARGET_NOT_FOUND" | "COMPATIBILITY_PROBE_TARGET_NOT_FOUND" | "HARNESS_PROFILE_NOT_FOUND" | "CLIENT_NOT_FOUND" | "CLIENT_KEY_NOT_FOUND" | "CLIENT_CONFLICT" | "CLIENT_PROTOCOL_NOT_ALLOWED" | "MODEL_BINDING_CONFLICT" | "MODEL_ENDPOINT_NOT_FOUND" | "MODEL_DISCOVERY_TARGET_NOT_FOUND" | "MODEL_DISCOVERY_FAILED" | "REQUEST_NOT_FOUND";
        ErrorDetail: {
            path: string;
            message: string;
        };
        GatewayClient: {
            id: string;
            name: string;
            /** @enum {string} */
            status: "active" | "disabled";
            profile: components["schemas"]["HarnessProfile"];
            allowedProtocols: ("openai-chat" | "openai-responses" | "anthropic-messages")[];
            keys: components["schemas"]["GatewayClientKey"][];
            /** Format: date-time */
            lastUsedAt: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        GatewayClientKey: {
            id: string;
            keyPrefix: string;
            keyLast4: string;
            /** @enum {string} */
            status: "active" | "expiring" | "revoked";
            /** Format: date-time */
            expiresAt: string | null;
            /** Format: date-time */
            lastUsedAt: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            revokedAt: string | null;
        };
        GatewayClientWithSecret: {
            client: components["schemas"]["GatewayClient"];
            /** @description 只在本次响应返回的完整 Gateway Client Key */
            key: string;
        };
        CreateGatewayClientBody: {
            name: string;
            profileSlug: string;
            allowedProtocols: ("openai-chat" | "openai-responses" | "anthropic-messages")[];
        };
        Connection: {
            /**
             * @description Provider ID
             * @example provider_01
             */
            id: string;
            /**
             * @description 连接名称
             * @example 本地模拟上游
             */
            name: string;
            /**
             * @description Provider 稳定标识
             * @example openai-compatible
             */
            providerSlug: string;
            /** @enum {string} */
            presetKind: "built-in" | "custom";
            /** @enum {string} */
            status: "active" | "disabled";
            endpoints: components["schemas"]["UpstreamEndpoint"][];
            accounts: components["schemas"]["ProviderAccount"][];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        UpstreamEndpoint: {
            /** @description Endpoint ID */
            id: string;
            /** @description Endpoint 名称 */
            name: string;
            protocol: components["schemas"]["ConnectionProtocol"];
            /**
             * Format: uri
             * @description 上游 Base URL
             */
            baseUrl: string;
            /** @description 上游请求路径 */
            requestPath: string;
            /** @enum {string} */
            authScheme: "bearer" | "x-api-key";
            supportsStreaming: boolean;
            /** @enum {string} */
            status: "active" | "disabled";
        };
        /** @enum {string} */
        ConnectionProtocol: "openai-chat" | "openai-responses" | "anthropic-messages";
        ProviderAccount: {
            /** @description Provider Account ID */
            id: string;
            /** @description 账号名称 */
            name: string;
            billingMode: components["schemas"]["BillingMode"];
            /** @enum {string} */
            status: "active" | "disabled";
            credentials: components["schemas"]["ProviderCredential"][];
        };
        /** @enum {string} */
        BillingMode: "metered" | "subscription" | "free" | "custom" | "unknown";
        ProviderCredential: {
            /** @description Credential ID */
            id: string;
            /** @description Credential 名称 */
            name: string;
            /** @description 只包含末四位的安全显示值 */
            maskedDisplay: string;
            /** @enum {string} */
            status: "unverified" | "healthy" | "auth_failed" | "unavailable" | "disabled";
            endpointIds: string[];
            /** Format: date-time */
            lastSuccessAt: string | null;
            /** Format: date-time */
            lastFailureAt: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            /** Format: date-time */
            rotatedAt: string | null;
            /** Format: date-time */
            disabledAt: string | null;
        };
        CreateConnectionBody: {
            name: string;
            providerSlug: string;
            endpoint: {
                name: string;
                protocol: components["schemas"]["ConnectionProtocol"];
                /** Format: uri */
                baseUrl: string;
                requestPath: string;
                /** @enum {string} */
                authScheme: "bearer" | "x-api-key";
                /** @default true */
                supportsStreaming: boolean;
            };
            account: {
                name: string;
                billingMode?: components["schemas"]["BillingMode"];
            };
            credential: {
                name: string;
                secret: string;
            };
        };
        AddConnectionEndpointBody: {
            name: string;
            protocol: components["schemas"]["ConnectionProtocol"];
            /** Format: uri */
            baseUrl: string;
            requestPath: string;
            /** @enum {string} */
            authScheme: "bearer" | "x-api-key";
            /** @default true */
            supportsStreaming: boolean;
            credentialIds: string[];
        };
        RotateProviderCredentialBody: {
            secret: string;
        };
        ProviderCredentialProbeResult: {
            credentialId: string;
            endpointId: string;
            model: string;
            /** @enum {string} */
            outcome: "succeeded" | "failed";
            /** @enum {string} */
            classification: "healthy" | "auth_failed" | "rate_limited" | "upstream_rejected" | "unavailable";
            statusCode: number | null;
            /** Format: date-time */
            checkedAt: string;
        };
        ProbeProviderCredentialBody: {
            endpointId: string;
            model: string;
        };
        CompatibilityProbeRun: {
            id: string;
            profileId: string;
            connectionId: string;
            endpointId: string;
            credentialId: string;
            harnessProfileId: string;
            model: string;
            checks: components["schemas"]["CompatibilityProbeCheck"][];
            /** @enum {string} */
            status: "queued" | "running" | "succeeded" | "failed";
            totalChecks: number;
            completedChecks: number;
            /** @enum {string|null} */
            currentCheck: "basic" | "stream" | "usage" | "unknown_field" | "tools" | "reasoning" | "structured_output" | "error_shape" | "harness" | null;
            errorMessage: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            startedAt: string | null;
            /** Format: date-time */
            completedAt: string | null;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @enum {string} */
        CompatibilityProbeCheck: "basic" | "stream" | "usage" | "unknown_field" | "tools" | "reasoning" | "structured_output" | "error_shape" | "harness";
        StartCompatibilityProbeBody: {
            credentialId: string;
            model: string;
        };
        UpstreamModelCatalog: {
            models: {
                id: string;
            }[];
        };
        DiscoverUpstreamModelsBody: {
            credentialId: string;
            /** @default /v1/models */
            modelsPath: string;
        };
        ConnectionCompatibility: {
            profiles: components["schemas"]["CompatibilityProfile"][];
            facts: components["schemas"]["CompatibilityFact"][];
            runs: components["schemas"]["CompatibilityProbeRun"][];
        };
        CompatibilityProfile: {
            id: string;
            connectionId: string;
            endpointId: string;
            harnessProfileId: string;
            /** @enum {string} */
            status: "verified" | "documented" | "partial" | "unverified" | "blocked";
            /** Format: date-time */
            lastProbeAt: string | null;
            summary: string | null;
        };
        CompatibilityFact: {
            profileId: string;
            featureKey: string;
            /** @enum {string} */
            supportLevel: "supported" | "partial" | "ignored" | "unsupported" | "degraded" | "unknown";
            /** @enum {string} */
            evidenceSource: "documented" | "probed" | "manual";
            evidenceRef: string;
            verifiedModelId: string;
            /** Format: date-time */
            verifiedAt: string;
            notes: string;
        };
        ProviderModelBinding: {
            id: string;
            endpointId: string;
            upstreamModelId: string;
            name: string;
            /** @enum {string} */
            status: "unverified" | "available" | "deprecated" | "unavailable";
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateProviderModelBindingBody: {
            endpointId: string;
            upstreamModelId: string;
            name: string;
        };
        GatewayRequest: {
            id: string;
            clientId: string;
            /** @enum {string} */
            protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
            requestedModel: string;
            upstreamModel: string;
            routingSnapshotVersion: number;
            stream: boolean;
            /** @enum {string} */
            outcome: "running" | "succeeded" | "failed" | "client_cancelled";
            statusCode: number | null;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            finishedAt: string | null;
            latencyMs: number | null;
            ttftMs: number | null;
            /** @enum {string} */
            observationStatus: "pending" | "complete" | "incomplete";
            observedBytes: number;
        };
        GatewayRequestDetail: components["schemas"]["GatewayRequest"] & {
            attempts: components["schemas"]["GatewayAttempt"][];
        };
        GatewayAttempt: {
            id: string;
            requestId: string;
            sequence: number;
            connectionId: string;
            /** @description 不透明凭据 ID，不是 Secret 原文 */
            credentialId: string;
            upstreamModel: string;
            /** @enum {string} */
            outcome: "running" | "succeeded" | "failed" | "client_cancelled";
            statusCode: number | null;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            finishedAt: string | null;
            errorCode: string | null;
            fallbackReason: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getControlPlaneHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 控制面健康状态 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: {
                            /** @enum {string} */
                            status: "ok";
                        };
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
        };
    };
    listHarnessProfiles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Harness Profile 列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["HarnessProfile"][];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    listGatewayClients: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 客户端列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayClient"][];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    createGatewayClient: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateGatewayClientBody"];
            };
        };
        responses: {
            /** @description 客户端已创建 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayClientWithSecret"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Harness Profile 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "HARNESS_PROFILE_NOT_FOUND",
                     *       "message": "Harness Profile 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 客户端名称已存在 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CLIENT_CONFLICT",
                     *       "message": "客户端名称已存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 客户端协议超出 Harness 允许范围 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CLIENT_PROTOCOL_NOT_ALLOWED",
                     *       "message": "客户端协议超出 Harness 允许范围",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    rotateGatewayClientKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                clientId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @default 24 */
                    overlapHours?: number;
                };
            };
        };
        responses: {
            /** @description 客户端 Key 已轮换 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayClientWithSecret"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 客户端不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CLIENT_NOT_FOUND",
                     *       "message": "客户端不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    revokeGatewayClientKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                keyId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 客户端 Key 已撤销 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayClient"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 客户端 Key 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CLIENT_KEY_NOT_FOUND",
                     *       "message": "客户端 Key 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    listConnections: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 连接列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"][];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    createConnection: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateConnectionBody"];
            };
        };
        responses: {
            /** @description 连接已创建 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 连接名称或 Endpoint 已存在 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CONNECTION_CONFLICT",
                     *       "message": "连接名称或 Endpoint 已存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    getConnectionById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider ID */
                connectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 连接详情 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 连接不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CONNECTION_NOT_FOUND",
                     *       "message": "连接不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    addConnectionEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider ID */
                connectionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddConnectionEndpointBody"];
            };
        };
        responses: {
            /** @description Endpoint 已添加 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 连接或绑定的 Credential 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "ENDPOINT_TARGET_NOT_FOUND",
                     *       "message": "连接或绑定的上游凭据不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Endpoint 名称或协议地址已存在 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CONNECTION_CONFLICT",
                     *       "message": "连接名称或 Endpoint 已存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    rotateProviderCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider Credential ID */
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RotateProviderCredentialBody"];
            };
        };
        responses: {
            /** @description 上游凭据已轮换 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 上游凭据不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CREDENTIAL_NOT_FOUND",
                     *       "message": "上游凭据不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 上游凭据与现有 Secret 重复 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CREDENTIAL_CONFLICT",
                     *       "message": "上游凭据与现有 Secret 重复",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    disableProviderCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider Credential ID */
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 上游凭据已禁用 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["Connection"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 上游凭据不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CREDENTIAL_NOT_FOUND",
                     *       "message": "上游凭据不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    probeProviderCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider Credential ID */
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProbeProviderCredentialBody"];
            };
        };
        responses: {
            /** @description 上游凭据测试已完成 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["ProviderCredentialProbeResult"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Credential 或绑定的 Endpoint 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CREDENTIAL_PROBE_TARGET_NOT_FOUND",
                     *       "message": "Credential 或绑定的 Endpoint 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 已禁用的 Credential 不能测试 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CREDENTIAL_DISABLED",
                     *       "message": "已禁用的 Credential 不能测试",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    probeEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Endpoint ID */
                endpointId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartCompatibilityProbeBody"];
            };
        };
        responses: {
            /** @description 兼容性测试已接受 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["CompatibilityProbeRun"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Endpoint 或绑定的 Credential 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMPATIBILITY_PROBE_TARGET_NOT_FOUND",
                     *       "message": "Endpoint 或绑定的 Credential 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Endpoint 或 Credential 已禁用 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "ENDPOINT_DISABLED",
                     *       "message": "已禁用的 Endpoint 不能测试",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    discoverUpstreamModels: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Endpoint ID */
                endpointId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DiscoverUpstreamModelsBody"];
            };
        };
        responses: {
            /** @description 上游模型目录 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["UpstreamModelCatalog"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Endpoint 或绑定的 Credential 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "MODEL_DISCOVERY_TARGET_NOT_FOUND",
                     *       "message": "Endpoint 或绑定的 Credential 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Endpoint 或 Credential 已禁用 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "ENDPOINT_DISABLED",
                     *       "message": "已禁用的 Endpoint 不能测试",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 上游模型目录不可用或格式不兼容 */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "MODEL_DISCOVERY_FAILED",
                     *       "message": "无法从上游获取兼容的模型目录",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    getConnectionCompatibility: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Provider ID */
                connectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 连接兼容性事实 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["ConnectionCompatibility"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 连接不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "CONNECTION_NOT_FOUND",
                     *       "message": "连接不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    listProviderModelBindings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 模型绑定列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["ProviderModelBinding"][];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    createProviderModelBinding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProviderModelBindingBody"];
            };
        };
        responses: {
            /** @description 模型绑定已创建 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["ProviderModelBinding"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 模型绑定的 Endpoint 不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "MODEL_ENDPOINT_NOT_FOUND",
                     *       "message": "模型绑定的 Endpoint 不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 模型绑定已存在 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "MODEL_BINDING_CONFLICT",
                     *       "message": "模型绑定已存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    listGatewayRequests: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 逻辑请求列表 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayRequest"][];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    getGatewayRequestById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 逻辑请求 ID */
                requestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 逻辑请求详情 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        success: true;
                        /** @enum {string} */
                        code: "COMMON_OK" | "COMMON_CREATED";
                        message: string;
                        data: components["schemas"]["GatewayRequestDetail"];
                        error: unknown;
                        meta: components["schemas"]["ResponseMeta"];
                    };
                };
            };
            /** @description 未认证 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "COMMON_UNAUTHORIZED",
                     *       "message": "未认证",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description 请求不存在 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "success": false,
                     *       "code": "REQUEST_NOT_FOUND",
                     *       "message": "请求不存在",
                     *       "data": null,
                     *       "error": {
                     *         "type": "business"
                     *       },
                     *       "meta": {
                     *         "requestId": "req_example"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
}
