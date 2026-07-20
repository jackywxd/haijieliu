# haijie-web

Haijie 紀念網站 — Next.js + Cloudflare Workers（OpenNext）重構版。

舊站（Gatsby）倉庫：`../haijie`

## 開發

```bash
npm run dev          # Next.js 本地開發
npm run preview      # OpenNext + workerd 預覽
npm run deploy       # 構建並部署到 Cloudflare Workers
```

本地媒體走同域代理（`.env.local`）：

- 瀏覽器請求：`/media/...`
- Next rewrite 上游：`R2_MEDIA_UPSTREAM`（默認 r2.dev 公網桶）

這樣可避開本機 DNS 無法解析 `media.haijieliu.com` 導致的音視頻加載失敗。修改 `.env.local` / `next.config.ts` 後需重啟 `npm run dev`。

## 媒體上傳（R2 `haijie-media`）

```bash
npm run upload:media              # music + images + icons
npm run upload:media -- --videos  # 另含 videos（約 5GB）
npm run upload:media -- --only videos
```

媒體 CDN：

`https://media.haijieliu.com`（R2 custom domain，已綁定）

開發備用：`https://pub-61e673eb650a4aae97101bc4eb2334df.r2.dev`

## 環境變量

見 `.env.local`：

- `NEXT_PUBLIC_R2_CDN_URL`
- `NEXT_PUBLIC_API_URL=/api`

## D1

Database：`haijie-messages`  
Schema：`migrations/0001_messages.sql`（已 remote apply）
