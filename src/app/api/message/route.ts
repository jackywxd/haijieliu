import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type MessageRow = {
  name: string;
  message: string;
  created_at: string;
};

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const { results } = await env.DB.prepare(
    "SELECT name, message, created_at FROM messages ORDER BY created_at DESC",
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

  const name = body.from?.trim();
  const message = body.message?.trim();

  if (!name || !message) {
    return NextResponse.json(
      { error: "from and message are required" },
      { status: 400 },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  await env.DB.prepare(
    "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
  )
    .bind(name, body.email?.trim() ?? null, message)
    .run();

  return NextResponse.json({ ok: true });
}
