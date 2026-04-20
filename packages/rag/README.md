# rag

本地知识库和检索模块。

V1 技术路线：

- 文档解析：Docling 优先，Unstructured 作为备选。
- 切片编排：LangChainJS。
- Embedding：本地模型，优先评估 BAAI bge 系列。
- 存储检索：PostgreSQL + pgvector。
- 关键词检索：PostgreSQL tsvector。
- 平台参考：FastGPT、Dify、RAGFlow 只作为产品和交互参考，不作为核心依赖。

职责：

- 项目资料解析
- 文档切片
- 本地 embedding
- pgvector 写入
- FAQ 匹配
- 关键词检索
- 向量召回
- 检索结果组装

当前已实现：

- `src/chunker.ts`：按标题、段落、表格行生成知识库切片。
- `src/parser.ts`：内置文本和 Markdown 解析器，后续接 Docling/Unstructured 适配器。
- `src/ingestion.ts`：解析、切片、embedding、入库的 ingestion 流水线。
- `src/embeddings.ts`：本地 embedding HTTP 适配接口和测试用确定性 provider。
- `src/retrieval.ts`：向量分数、关键词分数、混合排序和上下文组装。
- `src/memory-store.ts`：开发和测试用内存知识库。
- `src/pg-store.ts`：PostgreSQL + pgvector 存储和混合检索实现。
- `sql/001_knowledge_schema.sql`：PostgreSQL + pgvector 表结构和索引。

运行检查：

```bash
npm run rag:typecheck
npm run rag:test
```

详细决策见 `docs/knowledge-rag-v1.md`。
