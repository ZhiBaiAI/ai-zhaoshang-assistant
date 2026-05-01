# worker-service

异步任务服务。

当前先实现原生轮询模式：定时调用 `api-service` 查询待回复任务和评价回评任务，再触发建议回复生成。这样不用 Docker，也不要求先部署 Redis/BullMQ；后续需要队列化时，可以复用 `src/worker.ts` 的处理函数。

## 运行

```bash
WORKER_PROJECT_ID=project-1 \
API_BASE_URL=http://127.0.0.1:3001 \
API_TOKEN=change_me \
npm run worker:start
```

只跑一轮：

```bash
WORKER_PROJECT_ID=project-1 WORKER_ONCE=1 npm run worker:start
```

只跑 DingTalk A1 轮询：

```bash
WORKER_API_TASKS=0 \
WORKER_DINGTALK_A1_SYNC=1 \
DINGTALK_APP_KEY=your_app_key \
DINGTALK_APP_SECRET=your_app_secret \
DINGTALK_A1_SN_LIST=2010Axxxx0069 \
npm run worker:start
```

## 环境变量

- `WORKER_PROJECT_ID` / `PROJECT_ID`: 要处理的项目 ID。
- `WORKER_API_TASKS`: 设为 `0` 时不处理 api-service 的回复任务，可单独运行 DingTalk A1 轮询。
- `WORKER_API_BASE_URL` / `API_BASE_URL`: `api-service` 地址，默认 `http://127.0.0.1:3001`。
- `WORKER_API_TOKEN` / `API_TOKEN`: 可选，配置后请求 API 时带 Bearer token。
- `WORKER_INTERVAL_MS`: 轮询间隔，默认 `10000`。
- `WORKER_BATCH_SIZE`: 每轮处理任务数，默认 `5`。
- `WORKER_REVIEW_BATCH_SIZE`: 每轮处理评价回评任务数，默认 `5`。
- `WORKER_ONCE`: 设为 `1` 时只执行一轮。
- `WORKER_FEISHU_SYNC`: 设为 `1` 时每轮同步飞书多维表格里的线索状态。
- `WORKER_REVIEW_REPORTS`: 设为 `1` 时每轮生成评价日报和月报。
- `WORKER_DINGTALK_A1_SYNC`: 设为 `1` 时轮询 DingTalk A1 录音。
- `DINGTALK_A1_SN_LIST`: A1 设备 SN，多个用英文逗号分隔。
- `DINGTALK_A1_ACCESS_TOKEN`: 可选，直接使用指定 access token。
- `DINGTALK_APP_KEY` / `DINGTALK_APP_SECRET`: 未设置 `DINGTALK_A1_ACCESS_TOKEN` 时，用企业内部应用凭证自动获取 access token。
- `DINGTALK_A1_LOOKBACK_MS`: 每轮回看时间窗口，默认 24 小时。
- `DINGTALK_A1_DATA_DIR`: 本地保存目录，默认 `data/dingtalk-a1`。
- `DINGTALK_A1_DOWNLOAD_AUDIO`: 设为 `1` 时下载音频文件；默认只保存元数据、下载地址和听记概要。

## DingTalk A1 本地保存格式

```text
data/dingtalk-a1/
  records/<fileId>.json
  audio/<fileId>.m4a
```

每个 `records/<fileId>.json` 包含文件元数据、下载地址、听记概要 Markdown、可选音频本地路径，以及拉取失败项。

## 检查

```bash
npm run worker:typecheck
npm run worker:test
```
