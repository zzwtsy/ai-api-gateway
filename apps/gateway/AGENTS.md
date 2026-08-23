# Gateway Agent 指南

Gateway 是模块化单体。`src/app/` 是唯一允许连接具体实现的 Composition Root，也是进程生命周期所有者。

修改前按范围读取：

- 控制面：`src/control-plane/AGENTS.md`；
- 数据面：`src/data-plane/AGENTS.md`；
- Schema / Migration：`../../docs/conventions/database.md`；
- 进程启动、关闭或资源：`../../docs/architecture/engineering-foundation.md`。

任何模块 Import 都不得启动 Server、数据库 Pool、Undici Pool、Timer、Migration 或 Signal Handler。生产构建必须由 plain Node 运行；后端相对导入使用 `.js` 扩展名。

用户可见错误和 OpenAPI 说明使用中文；`operationId`、Error Code、字段名和日志键保持英文。
