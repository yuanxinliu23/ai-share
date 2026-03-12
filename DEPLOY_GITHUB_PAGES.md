# GitHub Pages 发布说明

本项目已整理为可直接发布的静态站点：

- 发布目录：`docs/`
- 入口页面：`docs/index.html`
- 子页面：
  - `docs/todolist/index.html`
  - `docs/mold-tofu-game/index.html`

## 1) 发布到 GitHub Pages

1. 把当前仓库推送到 GitHub。
2. 进入仓库 `Settings -> Pages`。
3. `Build and deployment` 选择：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/docs`
4. 保存后等待 1-3 分钟，访问：
   - `https://<你的用户名>.github.io/<仓库名>/`

## 2) ToDoList 的 AI 总结模式

`todolist` 已支持两种模式：

- 直连模式：在页面里填 `MiniMax API Key`，直接请求 MiniMax。
- 代理模式（推荐）：填 `Proxy URL`，由 serverless 代理持有 Key。

你可以在 `todolist` 页面中展开 `AI 配置（本地保存，可选）` 进行设置。

## 3) 可选：部署 serverless 代理（Cloudflare Worker）

代码位置：`serverless/minimax-proxy/`

### 快速步骤

1. 安装 Wrangler：
   ```bash
   npm i -g wrangler
   ```
2. 登录 Cloudflare：
   ```bash
   wrangler login
   ```
3. 准备配置：
   ```bash
   cd serverless/minimax-proxy
   cp wrangler.toml.example wrangler.toml
   ```
4. 设置密钥：
   ```bash
   wrangler secret put MINIMAX_API_KEY
   ```
5. 可选设置（不配则使用默认值）：
   ```bash
   wrangler secret put MINIMAX_BASE_URL
   wrangler secret put MINIMAX_MODEL
   ```
6. 发布：
   ```bash
   wrangler deploy
   ```
7. 得到类似 URL：
   - `https://lyx-ai-share-minimax-proxy.<subdomain>.workers.dev/api/summary`
8. 将该 URL 填入 ToDoList 的 `Proxy URL`，即可不在浏览器保存 API Key。

## 4) 每次更新发布内容

当你更新了 `portable/AI-Agent-Slides` 后，执行：

```bash
./scripts/sync-pages.sh
```

然后提交 `docs/` 变更并推送到 GitHub。

