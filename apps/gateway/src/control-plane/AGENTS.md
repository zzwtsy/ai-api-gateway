# 控制面规则

- 业务端点使用 `createRoute` 和显式类型化 Handler；
- `routes.ts` 接近静态公开合同，不做数据库 I/O，不内联长回调；
- Handler 只读取已校验输入、调用 Service/Repository 并返回统一响应；
- Feature 不直接导入另一个 Feature；跨 Feature 编排放到 Application Composition；
- 响应使用控制面 Envelope 和稳定 Error Code；
- Better Auth Session 与开发控制面令牌只属于控制面身份；
- 控制面登录不得接受 Gateway Client Key；
- OpenAPI `summary`、`description` 和 Response Description 使用中文；
- `operationId`、Tag、Schema 名、字段名和 Error Code 使用英文；
- 修改 Route 后更新合同测试并重新生成 Web API 类型。

- 配置派生状态只在数据库提交、完整编译和不变量验证后发布；失败时保留最后有效状态；
- 新公开配置项必须有当前消费者和证据，不为未来需求预建旋钮；
- 逃逸到真实入口的控制面缺陷按 `docs/postmortems/README.md` 复盘。
