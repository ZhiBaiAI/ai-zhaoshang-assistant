# llm-providers

在线 LLM 适配模块。

职责：

- 统一模型调用接口
- DeepSeek 适配
- 通义千问适配
- 豆包适配
- OpenAI 适配
- 超时、重试和用量记录

当前已实现：

- `OpenAICompatibleProvider`：兼容 OpenAI Chat Completions 风格接口，可用于 OpenAI、DeepSeek 等兼容服务。
- `StaticChatProvider`：本地测试用固定回复 provider。
