# V1 部署方案

## 推荐默认方案

默认采用：

```text
云端业务服务 + 客户本地抖音 Agent
```

客户本地只运行：

- douyin-agent
- 浏览器 Profile
- 本地运行日志

云端运行：

- api-service
- worker-service
- PostgreSQL + pgvector
- Redis + BullMQ
- 知识库和向量检索
- 飞书同步
- 通知服务

## 方案一：云端服务 + 本地 Agent

适合大多数客户。

客户准备：

- 一台能长期运行的电脑
- 抖音账号
- 飞书多维表格权限
- 企业微信/钉钉/飞书通知群机器人
- 商家招商资料

交付内容：

- 本地 douyin-agent 安装和配置
- 云端项目空间
- 知识库配置
- 飞书表格模板
- 通知机器人配置
- 销售使用说明
- 异常处理说明

优点：

- 客户部署简单
- 你们方便统一升级
- 数据和日志集中管理
- 后续多账号、多项目、多渠道更好扩展

缺点：

- 客户资料和会话会进入云端，需要做好数据隔离和授权说明
- 客户电脑仍需保持抖音登录和在线

## 方案二：全云端托管

适合不想部署任何本地程序的客户。

云端托管：

- 抖音浏览器环境
- douyin-agent
- api-service
- worker-service
- PostgreSQL
- Redis
- 知识库
- 飞书和通知配置

优点：

- 客户最省事
- 运维和升级最可控
- 适合月服务费模式

缺点：

- 你们承担账号登录环境和运维责任
- 抖音登录验证仍可能需要客户配合
- 单客户运行成本更高

## 方案三：全本地私有化

适合明确要求数据本地化的客户。

客户本地部署：

- douyin-agent
- api-service
- worker-service
- PostgreSQL + pgvector
- Redis
- 本地 embedding
- 知识库

优点：

- 数据留在客户环境
- 私有化交付能力更强

缺点：

- 部署和维护成本高
- 客户电脑或服务器必须长期稳定运行
- 升级和排障更复杂

## 基础设施部署

V1 不依赖 Docker。基础设施使用本机服务、云数据库或客户服务器上的原生服务：

```text
PostgreSQL 16 + pgvector
Redis 7+
Node.js 20+
```

`api-service` 当前只依赖 PostgreSQL + pgvector。Redis 会在 `worker-service` 接入 BullMQ 时启用。

### PostgreSQL 初始化

在已安装 PostgreSQL 和 pgvector 的环境中创建数据库和账号：

```bash
createuser ai_zhaoshang
createdb ai_zhaoshang -O ai_zhaoshang
psql -d ai_zhaoshang -c "create extension if not exists vector;"
```

如果数据库由云厂商提供，确认实例已经支持并启用 `pgvector` extension，然后配置 `DATABASE_URL`。

推荐连接串：

```bash
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang
```

### Redis 初始化

本机或服务器安装 Redis 后保持服务运行即可。后续 `worker-service` 会通过 `REDIS_URL` 或主机端口配置连接。

## api-service 本地运行

复制环境变量模板：

```bash
cd deploy
cp env.example .env
```

执行知识库表迁移：

```bash
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang npm run api:migrate
```

启动 API：

```bash
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang npm run api:start
```

本地 embedding 服务接入：

```bash
EMBEDDING_ENDPOINT=http://127.0.0.1:8000/v1/embeddings \
EMBEDDING_MODEL=BAAI/bge-m3 \
EMBEDDING_DIMENSION=1024 \
DATABASE_URL=postgres://ai_zhaoshang:change_me@127.0.0.1:5432/ai_zhaoshang \
npm run api:start
```
