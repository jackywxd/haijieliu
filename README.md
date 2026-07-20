# haijie-web

Haijie 紀念網站 — Next.js + Cloudflare Workers（OpenNext）重構版。

舊站（Gatsby）倉庫：`../haijie`

## 開發

```bash
npm run dev          # Next.js 本地開發
npm run preview      # OpenNext + workerd 預覽
npm run deploy       # 構建並部署到 Cloudflare Workers
```

## 媒體上傳（R2 `haijie-media`）

```bash
npm run upload:media              # music + images + icons
npm run upload:media -- --videos  # 另含 videos（約 5GB）
npm run upload:media -- --only videos
```

臨時公開域名（開發用）：

`https://pub-61e673eb650a4aae97101bc4eb2334df.r2.dev`

生產建議綁定：`media.haijieliu.com`（需 zone 在同一 Cloudflare 賬號）。

## 環境變量

見 `.env.local`：

- `NEXT_PUBLIC_R2_CDN_URL`
- `NEXT_PUBLIC_API_URL=/api`

## D1

Database：`haijie-messages`  
Schema：`migrations/0001_messages.sql`（已 remote apply）
