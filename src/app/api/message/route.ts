import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type MessageRow = {
  name: string;
  message: string;
  created_at: string;
  approved?: number;
};

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const { results } = await env.DB.prepare(
    `SELECT name, message, created_at
     FROM messages
     WHERE approved = 1
     ORDER BY created_at DESC`,
  ).all<MessageRow>();

  const rows = results ?? [];
  const messages = rows.map((row: MessageRow) => ({
    from: row.name,
    message: row.message,
    date: row.created_at,
  }));

  return NextResponse.json(messages);
}

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    from?: string;
    message?: string;
    email?: string;
  };

  const name = (body.from?.trim() ?? "").slice(0, MAX_NAME_LENGTH);
  const message = body.message?.trim().slice(0, MAX_MESSAGE_LENGTH);

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const sourceIp = request.headers.get("cf-connecting-ip");

  if (sourceIp) {
    const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { results } = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE source_ip = ? AND created_at > ?`,
    )
      .bind(sourceIp, cutoff)
      .all<{ count: number }>();

    if ((results?.[0]?.count ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "too many messages, please try again later" },
        { status: 429 },
      );
    }
  }

  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO messages
      (name, email, message, created_at, pk, sk, approved, origin, referer, source_ip, user_agent)
     VALUES (?, ?, ?, ?, 'message', ?, 1, ?, ?, ?, ?)`,
  )
    .bind(
      name,
      body.email?.trim() ?? null,
      message,
      createdAt,
      createdAt,
      request.headers.get("origin"),
      request.headers.get("referer"),
      request.headers.get("cf-connecting-ip"),
      request.headers.get("user-agent"),
    )
    .run();

  return NextResponse.json({ ok: true });
}
