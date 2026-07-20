export const config = {
  r2CdnUrl:
    process.env.NEXT_PUBLIC_R2_CDN_URL ||
    process.env.R2_CDN_URL ||
    "https://media.haijieliu.com",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "/api",
};

export function mediaUrl(path: string): string {
  const base = config.r2CdnUrl.replace(/\/$/, "");
  const clean = path.replace(/^\/+/, "");
  const encoded = clean
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encoded}`;
}
