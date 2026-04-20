# V1 知识库和 RAG 技术决策

## 结论

V1 自建知识库模块，不直接依赖 FastGPT、Dify、RAGFlow 等完整平台作为核心底座。

推荐组合：

```text
文档解析：Docling 优先，Unstructured 作为备选
切片编排：LangChainJS
Embedding：本地模型
存储检索：PostgreSQL + pgvector
全文检索：PostgreSQL tsvector
重排：预留 reranker 接口，V1 可先不启用
```

这样可以兼顾企业客户文档多样性、私有化交付、数据可控和当前 Node.js + TypeScript 项目路线。

## 为什么不直接用 FastGPT

FastGPT 可以作为参考产品和对标案例，但 V1 不作为核心依赖：

- 它是完整知识库和应用平台，深度接入后会影响项目自己的数据模型、权限模型和业务编排。
- 招商接待的核心逻辑不只是 RAG，还包括抖音会话、人工接管、留资识别、销售通知、飞书同步和回复风控。
- 客户私有化交付时，自建模块更容易做定制、备份、审计和后续迁移。
- 现阶段知识库规模可由 PostgreSQL + pgvector 承载，没必要先引入更重的平台。

可以借鉴 FastGPT、Dify、RAGFlow 的能力设计：

- 文档上传和解析状态
- 切片预览和手动修正
- QA 拆分
- 命中片段展示
- 问答测试台
- 未命中问题收集

## 企业文档处理策略

企业客户资料通常包括 PDF、Word、Excel、PPT、Markdown、网页、图片扫描件和人工整理的 FAQ。V1 先按资料类型分层处理。

### 普通文本

适用于品牌介绍、招商政策、扶持政策、开店流程等资料。

- 保留标题层级。
- 按标题、段落和语义边界切片。
- 每个切片建议 300 到 800 中文字。
- metadata 保留 `title_path`、`document_id`、`project_id`、`chunk_type`。

### 表格资料

适用于加盟费用表、区域政策表、设备清单、门店模型表。

- 不把整张表直接压成一段长文本。
- 保留表头，并按行或业务实体转换成结构化文本。
- 表格切片标记为 `table_row` 或具体业务类型，如 `cost_info`、`region_policy`。

示例：

```text
资料类型：加盟费用
城市级别：一线城市
加盟费：...
保证金：...
设备费：...
备注：...
```

### FAQ 和规则

FAQ、禁用话术、留资规则和转人工规则不只走向量检索，需要结构化存储并优先匹配。

- FAQ：优先精确匹配和相似问匹配。
- 禁用话术：进入回复风控，不直接作为普通上下文。
- 留资规则：用于判断是否引导手机号、微信、城市、预算、开店时间。
- 转人工规则：用于识别不确定问题、投诉、价格承诺、政策例外。

## 入库流程

```text
1. 上传项目资料
2. 创建 ingestion job
3. Docling / Unstructured 解析为结构化 Markdown 或 blocks
4. LangChainJS 根据标题、段落、表格和规则切片
5. 计算 chunk hash，跳过重复切片
6. 本地 embedding 模型生成向量
7. 写入 PostgreSQL + pgvector
8. 更新文档和任务状态
```

## 检索流程

```text
1. 接收用户私信和会话摘要
2. 判断意图和知识库分类
3. FAQ / 规则优先匹配
4. pgvector 向量召回
5. PostgreSQL tsvector 关键词召回
6. 合并去重和评分
7. 可选 rerank
8. 组装引用上下文给 AI 回复引擎
```

V1 默认采用混合检索：

- 向量检索解决语义相似问题。
- 关键词检索解决品牌名、费用数字、地区名、型号等精确词。
- FAQ 和规则匹配解决高确定性问题。

## 本地 Embedding

Embedding 必须本地化，在线 LLM 只负责理解和生成。

V1 选型原则：

- 中文检索效果稳定。
- 可本地部署，支持 CPU 起步，后续可切 GPU。
- 输出维度固定，方便 pgvector 建索引。
- 接口封装在 `packages/rag` 内，后续可替换模型。

建议优先评估：

- `BAAI/bge-m3`：多语言能力强，适合中文招商资料和混合语料。
- `BAAI/bge-large-zh-v1.5`：中文向量效果稳定，资源占用高于小模型。
- `BAAI/bge-small-zh-v1.5`：轻量，适合低配私有化部署或客户本地机器。

V1 可以先支持一种默认模型，再在配置中预留 `embedding_provider`、`embedding_model`、`embedding_dimension`。

## 数据表建议

核心表：

```text
knowledge_documents
knowledge_ingestion_jobs
knowledge_chunks
knowledge_chunk_embeddings
knowledge_faqs
knowledge_rules
```

`knowledge_chunks` 关键字段：

```text
id
project_id
document_id
chunk_type
title_path
content
content_hash
metadata
token_count
version
created_at
updated_at
```

`knowledge_chunk_embeddings` 关键字段：

```text
chunk_id
embedding_model
embedding_dimension
embedding vector
created_at
```

## V1 边界

V1 要做：

- 文档解析和切片。
- 本地 embedding。
- pgvector 写入和检索。
- FAQ、关键词、向量混合召回。
- 检索结果组装和引用记录。
- 知识库更新任务状态。

V1 暂不做：

- 完整知识库 SaaS 后台。
- 多租户复杂权限。
- 大规模向量库集群。
- 在线协同编辑。
- 自动网页爬取。
- 复杂 reranker 训练。

## 后续扩展

当知识库规模或检索性能超过 PostgreSQL + pgvector 的舒适区时，再评估：

- Qdrant：轻量独立向量库，适合工程替换。
- Milvus：大规模向量场景。
- Elasticsearch / OpenSearch：更强全文检索和 BM25 能力。

这些都应通过 `packages/rag` 的存储接口替换，不能影响 `api-service`、`worker-service` 和 AI 回复引擎的调用方式。
