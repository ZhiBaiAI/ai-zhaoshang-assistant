# 建材装修 AI 工具导航站

面向建材、装修、家居、装企老板的 AI 工具导航站，主站代码在 `apps/ai-nav-site/`。

## 本地预览导航站

```bash
npm run site:serve
```

打开 `http://localhost:4173`。

## GitHub Pages 部署

仓库已包含 `.github/workflows/pages.yml`。推送到 GitHub `main` 分支后，在仓库 Settings -> Pages 中选择 GitHub Actions 作为部署来源，站点会发布 `apps/ai-nav-site/`。

后续绑定自定义域名时，在 GitHub Pages 设置中添加域名，并按 GitHub 提示配置 DNS。

## 原有系统说明

# AI 招商抖音自动接待系统

本项目用于开发第一版 AI 招商接待方案：先从抖音私信自动化接待切入，跑通“咨询 - 回复 - 留资 - 线索 - 跟进通知”闭环，并为后续多渠道、轻 CRM、内容生产和潜客回访预留扩展空间。

## V1 主链路

```text
抖音私信
  -> 自动化读取
  -> 本地知识库检索
  -> 在线 LLM 生成回复
  -> 建议回复/人工确认/自动排队发送
  -> 留资识别
  -> PostgreSQL 入库
  -> 飞书多维表格同步
  -> 飞书通知销售
```

## 技术栈

- 语言：Node.js 20 + TypeScript
- 抖音自动化：Playwright + 持久化浏览器 Profile + CDP
- 数据库：PostgreSQL + pgvector
- 队列：Redis + BullMQ
- 知识库：本地资料 + 本地 embedding + 本地向量检索
- RAG 路线：Docling/Unstructured 解析 + LangChainJS 切片编排 + PostgreSQL/pgvector
- 模型：在线 LLM，Provider 可切换
- 协作：飞书多维表格
- 通知：飞书开放平台消息，支持飞书、企业微信、钉钉机器人 webhook
- 部署：默认云端业务服务 + 客户本地抖音 Agent，支持全云端托管和私有化部署

## 目录结构

```text
apps/
  douyin-agent/      抖音私信自动化 Agent，基于已有 MVP 迁移
  dianping-agent/    大众点评评价采集、上报和回评 Agent 框架
  api-service/       后端 API、项目配置、知识库、线索中心
  worker-service/    BullMQ 任务处理、飞书同步、通知发送
  admin-web/         轻量管理台

packages/
  rag/               本地知识库、embedding、pgvector 检索
  llm-providers/     在线 LLM 适配层
  notify/            企业微信/钉钉/飞书通知适配
  feishu/            飞书多维表格同步
  shared/            公共类型、常量、工具

docs/
  product-v1.md
  architecture-v1.md
  knowledge-rag-v1.md
  development-plan-v1.md
  deployment-v1.md

deploy/
  env.example
```

## 当前状态

- `apps/douyin-agent` 已迁移现有抖音私信读取 MVP。
- `apps/douyin-agent` 已支持 `watch` 模式，可持续轮询抖音私信，写入 `data/inbox`，可上报 `api-service`，支持失败重试队列、Agent 心跳和 API 发送队列消费。
- `apps/dianping-agent` 已支持大众点评评价样例导入、标准化、落盘和 API 上报框架。
- `apps/api-service` 已支持项目配置、知识库文档入库、检索、Token 鉴权、抖音消息接收、会话、人工接管、待回复任务、发送队列、建议回复、线索列表、飞书状态同步、运营日志和 Agent 状态 API。
- `apps/api-service` 已支持评价入库、评价回复任务、评价日报/月报和评价回复发送结果回写。
- `apps/worker-service` 已支持轮询待回复任务、评价回复任务、触发建议回复生成、评价报表生成和飞书线索状态同步。
- `apps/admin-web` 已提供静态管理台，用于项目配置、会话、回复任务、线索、评价分析、日志和总览。
- `packages/rag` 已支持文本/Markdown 解析、切片、本地 embedding 接口、内存 store、PostgreSQL/pgvector store 和混合检索。
- `packages/feishu` / `packages/notify` 已支持飞书开放平台消息，以及飞书、企业微信、钉钉 webhook 通知。
- V1 先不做多平台、主动批量私信和 OpenClaw。
- 后续开发优先级见 `docs/development-plan-v1.md`。
