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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    from?: string;
    message?: string;
    email?: string;
  };

  const name = body.from?.trim() ?? "";
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const { env } = await getCloudflareContext({ async: true });
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
