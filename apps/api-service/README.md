# api-service

后端业务服务。

职责：

- 项目和商家配置
- 知识库管理
- 会话、消息、线索 API
- AI 回复引擎入口
- 人工接管状态
- 飞书和通知配置

当前已实现项目配置、知识库、会话、回复任务、线索、评价分析、飞书同步、Agent 状态和运营日志 API。

## 运行

```bash
npm run api:start
```

默认监听：

```text
http://127.0.0.1:3001
```

生产或客户环境建议配置 `API_TOKEN`。配置后除 `GET /health` 外，所有业务接口都需要：

```http
Authorization: Bearer your_token
```

可通过环境变量调整：

```bash
API_PORT=3002 npm run api:start
```

默认不配置数据库时使用内存知识库，适合本地开发和测试。配置 `DATABASE_URL` 后使用 PostgreSQL + pgvector：

```bash
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang npm run api:start
```

首次使用数据库前执行迁移：

```bash
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang npm run api:migrate
```

## API

### 项目配置

```http
POST /projects/upsert
POST /projects
POST /projects/get
```

核心字段：

```json
{
  "id": "project-1",
  "name": "招商项目",
  "replyMode": "assisted",
  "autoSendEnabled": false,
  "handoffEnabled": true,
  "enabled": true
}
```

### 健康检查

```http
GET /health
```

### 文档入库

```http
POST /knowledge/documents/ingest
```

请求体：

```json
{
  "id": "doc-1",
  "projectId": "project-1",
  "title": "招商手册",
  "sourceType": "markdown",
  "content": "# 加盟费用\n加盟费 10 万，保证金 2 万。"
}
```

### 知识库检索

```http
POST /knowledge/retrieve
```

请求体：

```json
{
  "projectId": "project-1",
  "query": "加盟费用是多少",
  "topK": 5
}
```

### 抖音消息上报

```http
POST /channels/douyin/messages
```

请求体由 `douyin-agent` 的 `watch` 模式自动发送，核心字段：

```json
{
  "schemaVersion": 1,
  "source": "douyin",
  "projectId": "project-1",
  "capturedAt": "2026-04-17T10:00:00.000Z",
  "count": 1,
  "events": []
}
```

### 评价上报

```http
POST /channels/reviews
POST /channels/dianping/reviews
```

请求体由评价 Agent 自动发送，当前首个来源是 `dianping`：

```json
{
  "schemaVersion": 1,
  "source": "dianping",
  "projectId": "project-1",
  "capturedAt": "2026-04-18T09:00:00.000Z",
  "count": 1,
  "events": []
}
```

### Agent 心跳

```http
POST /agents/heartbeat
```

由 `douyin-agent` 自动发送，用于查看采集端最近状态。

### Agent 状态列表

```http
POST /agents/status
```

请求体：

```json
{
  "projectId": "project-1"
}
```

### 会话列表

```http
POST /conversations
```

请求体：

```json
{
  "projectId": "project-1"
}
```

### 会话详情和人工接管

```http
POST /conversations/detail
POST /conversations/handoff
```

人工接管请求体：

```json
{
  "conversationId": "douyin:project-1:客户A",
  "handoff": true,
  "reason": "人工处理"
}
```

### 待回复任务

```http
POST /reply-tasks/pending
POST /reply-tasks/list
```

请求体：

```json
{
  "projectId": "project-1",
  "limit": 20
}
```

### 生成建议回复

```http
POST /reply-tasks/generate
```

请求体：

```json
{
  "taskId": "reply_task_douyin_msg_xxx"
}
```

### 发送队列

```http
POST /reply-tasks/queue-send
POST /reply-tasks/sendable
POST /reply-tasks/send-result
```

`assisted` 模式下，管理台或人工审核后调用 `/reply-tasks/queue-send`。`auto` 模式下，生成建议回复后会直接进入 `queued` 状态，由 `douyin-agent` 拉取发送。

### 线索列表

```http
POST /leads
POST /leads/update-status
```

请求体：

```json
{
  "projectId": "project-1"
}
```

### 评价、回评和报表

```http
POST /reviews/list
POST /review-reply-tasks/pending
POST /review-reply-tasks/list
POST /review-reply-tasks/generate
POST /review-reply-tasks/queue-send
POST /review-reply-tasks/sendable
POST /review-reply-tasks/send-result
POST /review-reports/generate
POST /review-reports/list
```

日报/月报生成：

```json
{
  "projectId": "project-1",
  "source": "dianping",
  "period": "daily",
  "date": "2026-04-18T12:00:00.000Z"
}
```

### 日志和总览

```http
POST /logs
POST /ops/overview
```

## Embedding

默认使用测试用确定性 embedding，便于本地开发。

接本地模型服务时配置：

```bash
EMBEDDING_ENDPOINT=http://127.0.0.1:8000/v1/embeddings \
EMBEDDING_MODEL=BAAI/bge-m3 \
EMBEDDING_DIMENSION=1024 \
npm run api:start
```

## LLM

默认使用测试用固定回复。接 DeepSeek 或其他 OpenAI-compatible 服务时配置：

```bash
LLM_BASE_URL=https://api.deepseek.com/v1 \
LLM_API_KEY=your_api_key \
LLM_MODEL=deepseek-chat \
npm run api:start
```

## 通知渠道

生成回复时识别到高意向线索或需要人工接管，会尝试发送通知。可以同时配置飞书、企业微信和钉钉。

优先使用飞书开放平台应用发消息：

```bash
FEISHU_APP_ID=cli_xxx \
FEISHU_APP_SECRET=xxx \
FEISHU_NOTIFY_RECEIVE_ID=oc_xxx \
FEISHU_NOTIFY_RECEIVE_ID_TYPE=chat_id \
npm run api:start
```

同步高意向线索到飞书多维表格时，继续配置：

```bash
FEISHU_BITABLE_APP_TOKEN=app_xxx \
FEISHU_LEADS_TABLE_ID=tbl_xxx \
npm run api:start
```

从飞书多维表格同步线索跟进状态：

```http
POST /integrations/feishu/sync-lead-status
```

没有开放平台配置时，可退回飞书机器人 webhook：

```bash
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx npm run api:start
```

企业微信机器人 webhook：

```bash
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx npm run api:start
```

钉钉机器人 webhook：

```bash
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx \
DINGTALK_SECRET=SECxxx \
npm run api:start
```

## 检查

```bash
npm run api:typecheck
npm run api:test
```
