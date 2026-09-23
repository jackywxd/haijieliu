# haijie-web

Haijie 紀念網站 — Next.js + Cloudflare Workers（OpenNext）。

## 開發

```bash
npm run dev          # Next.js 本地開發
npm run preview      # OpenNext + workerd 預覽
npm run deploy       # 構建並部署到 Cloudflare Workers
```

## 測試

```bash
npm run test:unit    # 秒級，不需瀏覽器
npm run build && npm run test:e2e    # 自動用 wrangler dev 提供 out/，跑 iPhone WebKit + 桌面 Chromium
SITE=https://haijieliu.com npm run test:smoke    # 唯讀，檢查線上所有路由與媒體
```

首次跑 E2E 前需安裝瀏覽器：`npx playwright install webkit chromium`。

- **CI（每個 PR）**：build → unit → 以 `wrangler dev` 提供建置 → smoke → E2E。媒體直接向正式 CDN 讀取，所以「新增年份卻沒上傳 MP4」會在合併前就失敗。
- **部署（push 到 main）**：記下目前線上版本 → 部署 → 等到正式站開始提供這次的 build → smoke + iPhone WebKit 瀏覽器 smoke。任何一項失敗就自動 `wrangler rollback` 回上一版，workflow 標紅。

每個測試開頭都寫著它防範的失敗；新增測試時請維持這個慣例。

## 媒體資源

媒體存放於本倉庫 `public/media/`，以 **Git LFS** 管理大文件：

```
public/media/
  music/
  images/          # 含 gallery/、bg/、icons/
  videos/          # HLS 片段（LFS）
```

```bash
# 首次克隆後拉取 LFS 對象
git lfs install
git lfs pull

# 新增圖片後更新清單（prebuild 會自動執行）
npm run sync:media

# 上傳到 R2（可選，CDN 用）
npm run upload:media
npm run upload:media -- --videos
```

瀏覽器統一請求 `/media/...`：
- 優先使用 `public/media` 本地文件
- 缺失時 fallback rewrite 到 R2 CDN

## 環境變量

見 `.env.local`：

- `NEXT_PUBLIC_R2_CDN_URL`（本地建議 `/media`）
- `R2_MEDIA_UPSTREAM`（fallback 上游）
- `NEXT_PUBLIC_API_URL=/api`

## D1

Database：`haijie-messages`  
Schema：`migrations/0001_messages.sql`
