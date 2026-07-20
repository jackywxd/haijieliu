declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    R2_CDN_URL?: string;
    API_URL?: string;
  }
}

export {};
