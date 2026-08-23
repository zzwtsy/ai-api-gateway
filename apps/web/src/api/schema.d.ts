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
        Connection: {
            /**
             * @description 连接 ID
             * @example conn_01
             */
            id: string;
            /**
             * @description 用户可读的连接名称
             * @example 本地模拟上游
             */
            name: string;
            /**
             * @description Provider 标识
             * @example openai-compatible
             */
            provider: string;
            protocol: components["schemas"]["ConnectionProtocol"];
            /**
             * Format: uri
             * @description 上游 Provider Base URL
             * @example http://127.0.0.1:4010
             */
            baseUrl: string;
            enabled: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @enum {string} */
        ConnectionProtocol: "openai-chat" | "openai-responses" | "anthropic-messages";
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
        ErrorCode: "COMMON_OK" | "COMMON_CREATED" | "COMMON_VALIDATION_FAILED" | "COMMON_UNAUTHORIZED" | "COMMON_NOT_FOUND" | "COMMON_CONFLICT" | "COMMON_INTERNAL_ERROR" | "CONNECTION_NOT_FOUND" | "CONNECTION_CONFLICT" | "REQUEST_NOT_FOUND";
        ErrorDetail: {
            path: string;
            message: string;
        };
        CreateConnectionBody: {
            name: string;
            provider: string;
            protocol: components["schemas"]["ConnectionProtocol"];
            /** Format: uri */
            baseUrl: string;
            /** @default true */
            enabled: boolean;
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
                /** @description 连接 ID */
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
