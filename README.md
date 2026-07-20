# haijie-web

Haijie 紀念網站 — Next.js + Cloudflare Workers（OpenNext）。

## 開發

```bash
npm run dev          # Next.js 本地開發
npm run preview      # OpenNext + workerd 預覽
npm run deploy       # 構建並部署到 Cloudflare Workers
```

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
