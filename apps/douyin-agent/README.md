# 抖音创作者中心私信读取 MVP

## 项目说明
本项目是抖音私信 Agent。主要功能是通过 Playwright 启动浏览器，打开抖音创作者中心网页版，读取会话和新消息，上报到 `api-service`，并在明确开启发送开关后消费 API 下发的待发送回复。默认仍是只读和 dry-run，真正点击发送需要显式配置。

## 安装命令
请确保已经安装 Node.js (建议 v20+)，在项目根目录运行：
```bash
npm install
```

## 运行命令
项目中包含了以下几个主要命令：

- **启动浏览器并保持打开状态**（用于测试登录和持久化会话）：
  ```bash
  npm run start
  ```

- **检查页面 DOM 寻找聊天入口候选元素**（用于调试选择器）：
  ```bash
  npm run inspect
  ```

- **提取当前选中的聊天可见消息内容**：
  ```bash
  npm run capture
  ```

- **遍历左侧会话列表并分别保存可见消息**：
  ```bash
  npm run scan
  ```

- **持续轮询私信并保存新消息**：
  ```bash
  npm run watch
  ```

- **只轮询一次私信**（用于测试选择器和输出文件）：
  ```bash
  npm run watch:once
  ```

- **进行 TypeScript 类型检查**：
  ```bash
  npm run typecheck
  ```

## 生成文件位置
脚本运行后，相关日志和文件会被保存在以下路径：
- `debug/inspect-*.json`: 页面分析阶段检测到的侧边栏/聊天候选 DOM 结构信息。
- `debug/capture-candidates-*.json`: 自动进入聊天页失败时保存的候选入口信息。
- `data/screenshots/*.png`: 各阶段保存的页面截图（包括 inspect 与 capture 时的状态截图）。
- `data/captures/chat-*.json`: 当前对话文本摘要、发送方向、时间提示、会话列表与抽取时间戳。
- `data/captures/session-*.json`: `scan` 模式按会话保存的聊天内容。
- `data/captures/watch-*.json`: `watch` 模式发现新消息时保存的会话快照。
- `data/inbox/douyin-messages-*.json`: `watch` 模式输出的新消息事件，后续可由 API/Worker 消费。
- `data/state/douyin-watch-state.json`: `watch` 模式去重状态。
- `data/state/douyin-watch-status.json`: `watch` 模式最近一次轮询状态，便于后续后台或运维脚本读取。
- `data/state/douyin-upload-pending.json`: API 上报失败后的本地待重试队列，下一轮会自动补传。
- `~/.douyin-dm-autoreply/browser-profile/`: Chrome 浏览器的 User Data Directory（用于保存 Playwright 持久化登录态）。默认放在用户 Home 目录下，避免 macOS 上 Chromium 在项目目录内卡住的问题。

## 浏览器 Profile 配置
默认 profile 路径为 `~/.douyin-dm-autoreply/browser-profile`。可以通过环境变量覆盖：
```bash
BROWSER_PROFILE_DIR=/tmp/douyin-browser-profile npm run start
```

> **macOS 注意**：如果 headed Chromium 打开后卡在 `about:blank`，通常是因为 profile 目录位于项目文件夹内。
> 请确认使用默认路径或通过 `BROWSER_PROFILE_DIR` 指定一个项目外的目录。

## 推荐使用流程
先运行 `npm run start`，在打开的浏览器中手动完成登录、扫码或验证码，然后保持浏览器打开。
另开一个终端运行 `npm run inspect`、`npm run capture` 或 `npm run scan`。这些命令会优先通过本地 CDP 端口复用已经登录的浏览器。

自动获取私信建议先跑：
```bash
npm run start
```
完成登录后另开终端运行：
```bash
npm run watch
```
首次测试建议先运行单轮模式：
```bash
npm run watch:once
```
默认每 30 秒轮询一次。首次轮询会扫描当前可见会话，后续默认只扫描有未读数的会话。可通过环境变量调整：
```bash
WATCH_INTERVAL_MS=15000 WATCH_SCAN_ALL=1 npm run watch
```

上报到 `api-service`：
```bash
API_BASE_URL=http://127.0.0.1:3001 \
API_TOKEN=change_me \
DOUYIN_PROJECT_ID=project-1 \
DOUYIN_AGENT_ID=douyin-agent-1 \
npm run watch
```

上报失败不会中断本地采集，消息仍会写入 `data/inbox`，并进入 `data/state/douyin-upload-pending.json` 等下一轮自动重试。配置 `API_BASE_URL` 和 `DOUYIN_PROJECT_ID` 后，采集端也会向 `/agents/heartbeat` 上报心跳状态。

消费 API 发送队列：

```bash
API_BASE_URL=http://127.0.0.1:3001 \
API_TOKEN=change_me \
DOUYIN_PROJECT_ID=project-1 \
DOUYIN_SEND_ENABLED=1 \
DOUYIN_SEND_DRY_RUN=1 \
npm run watch
```

`DOUYIN_SEND_DRY_RUN=1` 时只填入输入框，不点击发送；确认选择器和风控状态稳定后，再设为 `0`。

常用环境变量：
- `WATCH_INTERVAL_MS`: 轮询间隔，默认 `30000`。
- `WATCH_MAX_SESSIONS`: 每轮最多扫描会话数，默认 `50`。
- `WATCH_SCROLLS`: 进入会话后向上滚动加载历史的次数，默认 `2`。
- `WATCH_SCAN_ALL`: 设为 `1` 时每轮扫描所有会话；默认后续轮次只扫未读会话。
- `WATCH_BOOTSTRAP_EMIT`: 默认 `1`，首次启动会把当前扫描到的消息作为事件输出；设为 `0` 时只建立去重基线，不输出历史消息。
- `WATCH_ONCE`: 设为 `1` 时只执行一轮，等价于 `npm run watch:once`。
- `API_BASE_URL` / `DOUYIN_API_BASE_URL`: api-service 地址，配置后自动上报新消息。
- `DOUYIN_PROJECT_ID` / `PROJECT_ID`: 上报消息所属项目 ID。
- `DOUYIN_AGENT_ID`: 采集端实例 ID，默认使用本机 hostname 生成。
- `API_TOKEN` / `DOUYIN_API_TOKEN`: 可选，上报时附带 Bearer token。
- `DOUYIN_SEND_ENABLED`: 设为 `1` 时拉取 API 的 `queued` 回复任务。
- `DOUYIN_SEND_DRY_RUN`: 默认 `1`，只填入不发送；设为 `0` 后才点击发送。
- `DOUYIN_SEND_LIMIT`: 每轮最多处理发送任务数，默认 `5`。

## 已知限制
1. **网页 DOM 会变**：前端页面结构可能频繁更新，基于类名或样式的提取规则可能会随着抖音前端发版而失效。
2. **需要手动验证**：如果出现手机号码验证登录、二维码扫描、滑块验证码或页面安全确认，工具将自动挂起，并在控制台提示用户接管并完成验证。
3. **只读取可见消息**：目前的抓取机制主要提取当前页面上渲染且可见的消息气泡节点，`watch` 会按 `WATCH_SCROLLS` 向上滚动加载一部分历史。
4. **发送需显式开启**：默认不点击发送；只有 `DOUYIN_SEND_ENABLED=1` 且 `DOUYIN_SEND_DRY_RUN=0` 时才会执行发送。
5. **隐私防范**：在解析提取数据时故意不记录、不保存 cookie、token 和用户账号密码等核心登录态信息内容。

## 下一阶段建议
- 使用真实账号联调发送按钮选择器和风控场景。
- 在生产日志中增加敏感信息脱敏和截图留存策略。
