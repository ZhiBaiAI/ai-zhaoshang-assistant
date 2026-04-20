# V1 技术架构

## 架构原则

- 抖音自动化只是渠道接入层，不承载业务逻辑。
- PostgreSQL 是主数据源，飞书多维表格只是销售协作界面。
- 知识库、embedding、向量检索尽量本地化，在线 LLM 只负责生成和理解。
- 知识库模块自建，FastGPT、Dify、RAGFlow 只作为产品和交互参考，不作为 V1 核心依赖。
- 核心模块按多渠道、多客户、多项目预留扩展。
- V1 先做模块化单体和少量 Worker，不拆微服务。

## 总体架构

```text
客户电脑或托管浏览器
  douyin-agent
    - 读取私信
    - 发送回复
    - 上报异常

云端或私有化业务服务
  api-service
    - 项目配置
    - 知识库管理
    - 会话和线索 API
    - AI 回复接口

  worker-service
    - 回复任务
    - 飞书同步
    - 通知发送
    - 异常重试

基础设施
  PostgreSQL + pgvector
  Redis + BullMQ

外部系统
  在线 LLM
  飞书多维表格
  企业微信/钉钉/飞书机器人
```

## 组件职责

### douyin-agent

只负责抖音侧自动化：

- 保持浏览器登录态
- 读取会话列表和新消息
- 将消息提交给业务服务
- 接收待发送回复
- 自动发送私信
- 保存截图和自动化日志
- 发现异常时上报告警

### api-service

负责核心业务：

- 商家和项目配置
- 知识库资料管理
- 会话、消息、线索数据 API
- AI 回复引擎入口
- 人工接管状态
- 飞书和通知配置

### worker-service

负责异步任务：

- 新消息处理
- AI 回复任务
- 飞书同步任务
- 通知任务
- 登录失效和异常告警
- 失败任务重试

### rag

负责本地知识库：

- Docling / Unstructured 文档解析适配
- 文档切片
- LangChainJS 切片和入库编排
- 本地 embedding
- pgvector 写入
- FAQ 精确匹配
- 关键词检索
- 向量召回
- 结果重排预留

V1 技术决策见 `docs/knowledge-rag-v1.md`。

### llm-providers

统一在线模型接口：

- DeepSeek
- 通义千问
- 豆包
- OpenAI
- 后续其他模型

### feishu

负责飞书多维表格：

- 创建线索记录
- 更新线索记录
- 读取销售跟进状态
- 同步日志和重试

### notify

负责通知适配：

- 企业微信机器人
- 钉钉机器人
- 飞书机器人
- 统一事件消息模板

## 核心数据流

```text
1. douyin-agent 读取新私信
2. api-service 保存消息并去重
3. worker-service 创建回复任务
4. rag 检索项目知识库
5. llm-providers 调用在线 LLM
6. AI 回复引擎做风险校验和留资判断
7. douyin-agent 发送回复
8. lead-service 创建或更新线索
9. feishu 同步到多维表格
10. notify 通知销售
```

## 扩展预留

### 渠道扩展

V1 只实现抖音：

```text
channel_adapter/douyin
```

后续可新增：

```text
channel_adapter/xiaohongshu
channel_adapter/enterprise_wechat
channel_adapter/wechat_official
channel_adapter/web_chat
```

### 线索生命周期

建议状态：

```text
new
chatting
contact_pending
contacted
qualified
invited
visited
deal
invalid
lost
```

### 知识库分类

V1 就按后续内容生产和销售回访预留：

```text
brand_intro
investment_policy
cost_info
joining_condition
region_policy
support_policy
profit_info
customer_pain
selling_points
success_cases
faq
forbidden_rules
lead_rules
handoff_rules
```
