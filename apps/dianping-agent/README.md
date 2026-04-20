# dianping-agent

大众点评评价 Agent 框架。

当前没有账号和可验证页面，先实现本地样例文件导入、标准化、落盘和 API 上报。真实账号联调时，只需要把页面抓取结果转换成 `RawDianpingReview`，继续复用现有标准化和上报逻辑。

## 本地样例导入

样例 JSON 可以是数组：

```json
[
  {
    "shopId": "shop-1",
    "shopName": "测试门店",
    "reviewId": "review-1",
    "authorName": "用户A",
    "rating": 4,
    "content": "服务不错",
    "reviewTime": "2026-04-18T08:00:00.000Z"
  }
]
```

运行：

```bash
DIANPING_PROJECT_ID=project-1 \
DIANPING_SAMPLE_PATH=./sample-reviews.json \
API_BASE_URL=http://127.0.0.1:3001 \
API_TOKEN=change_me \
npm --workspace apps/dianping-agent run ingest:file
```

生成文件：

- `data/inbox/dianping-reviews-*.json`: 标准化后的评价批次。

## 后续联调点

- 登录态保持
- 门店列表识别
- 评价列表分页和增量抓取
- 回复输入框和发送按钮选择器
- 风控、验证码和人工接管流程
