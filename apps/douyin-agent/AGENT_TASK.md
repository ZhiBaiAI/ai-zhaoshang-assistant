# Antigravity Agent Task: 抖音创作者中心私信读取 MVP

你负责在本项目内实现第一阶段 MVP。不要只写方案，请直接创建代码、配置、运行说明，并尽量本地验证。

## 背景

我们要做一个抖音私信辅助工具。最终目标是根据聊天上下文生成回复，但当前阶段只实现“打开网页端、定位聊天窗口、读取当前会话可见聊天内容”。

网页入口优先使用：

- `https://creator.douyin.com/`

如果站内需要用户登录、扫码、验证码、安全确认，请暂停自动流程并在终端提示用户手动完成。不要尝试绕过验证码或安全风控。

## 推荐技术栈

使用 TypeScript + Playwright。

建议项目结构：

```text
package.json
tsconfig.json
src/
  index.ts
  browser.ts
  douyin.ts
  extractChat.ts
  types.ts
data/
  captures/
  screenshots/
debug/
```

## 功能要求

实现命令：

```bash
npm run start
npm run inspect
npm run capture
```

`npm run start`：

- 使用非 headless 浏览器打开 `https://creator.douyin.com/`。
- 优先使用 Playwright persistent context 保存登录态，profile 目录放在项目内的 `.browser-profile/`。
- 如果检测到登录页、二维码、验证码、滑块或安全验证，输出清晰提示并等待用户手动完成。
- 不要保存账号密码。

`npm run inspect`：

- 打开页面后尝试识别可能的私信/消息/聊天入口。
- 识别策略不要依赖固定坐标，优先用文本、role、aria、data 属性、URL 变化、页面结构。
- 将页面标题、URL、候选入口文本、候选 DOM 片段保存到 `debug/inspect-*.json`。
- 保存当前截图到 `data/screenshots/inspect-*.png`。

`npm run capture`：

- 打开创作者中心。
- 进入私信/聊天界面。如果无法自动找到入口，输出候选入口并要求用户手动点到聊天页，然后按回车继续。
- 识别左侧会话列表和右侧聊天窗口。
- 读取当前选中会话的可见聊天内容。
- 尽量提取：
  - 会话昵称或标题
  - 消息方向：`incoming` / `outgoing` / `unknown`
  - 消息文本
  - 时间文本，如果页面可见
  - 原始 DOM 片段或调试 selector
- 保存为 `data/captures/chat-YYYYMMDD-HHmmss.json`。
- 同时保存截图到 `data/screenshots/chat-YYYYMMDD-HHmmss.png`。

## 约束

- 当前阶段严禁自动发送、点赞、关注、拉黑、删除、标记已读等会改变账号状态的操作。
- 当前阶段只读取当前页面可见内容。
- 如果页面出现验证码、登录确认、敏感权限、风控提示，请暂停并提示用户处理。
- 代码要适合后续扩展为“生成建议回复”，但现在不要接入发送动作。
- 不要把 cookie、token、账号信息写入日志或 JSON。

## 实现建议

1. 先封装浏览器启动：
   - `chromium.launchPersistentContext('.browser-profile', { headless: false })`
   - viewport 建议 `1440x900`
   - 设置合理 timeout。

2. 封装人工等待：
   - 检测登录/验证相关文本。
   - 命令行提示用户完成后按回车。

3. 私信入口识别：
   - 文本候选：`私信`、`消息`、`互动管理`、`用户消息`、`粉丝群聊`、`客服`。
   - 同时扫描 `a`, `button`, `[role=button]`, `[role=menuitem]`。
   - 如果自动点击失败，输出候选列表供人工选择或让用户手动点击。

4. 聊天内容抽取：
   - 优先找滚动容器和消息气泡容器。
   - 可以根据元素位置推断方向：靠左为 `incoming`，靠右为 `outgoing`。
   - 去除空文本、按钮文本、输入框文本、重复文本。
   - 保留调试信息，便于下一轮修 selector。

5. 验证：
   - 至少保证 `npm run inspect` 可以启动浏览器、打开页面、保存截图和 inspect JSON。
   - 无法登录时不要失败退出，应给出人工处理提示。

## 输出要求

完成后请在项目 README 里补充：

- 安装命令
- 运行命令
- 生成文件位置
- 已知限制
- 下一阶段建议

并在最终回复里列出改动文件和验证结果。
