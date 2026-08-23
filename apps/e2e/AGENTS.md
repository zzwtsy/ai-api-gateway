# 端到端测试规则

- 启动真实 Gateway 和 Web 入口，只 Mock 外部 Provider；
- 验证外部世界：检查 Mock Provider 收到的请求、客户端收到的字节以及 Request/Attempt 记录；
- 不只根据 Gateway 自己显示的“成功”状态判定通过；
- Keyless 黄金路径必须确定且可重复；
- 真实 Provider Smoke Test 为可选项，没有凭据时自行跳过；
- Fixture 使用明显假 Key，不包含用户 Prompt、Cookie 或真实上游响应；
- 浏览器断言使用中文界面文本，技术 ID 和协议值可以保持英文。
