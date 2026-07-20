#!/usr/bin/env node
/**
 * Import DynamoDB message export (results.csv) into D1 haijie-messages.
 *
 * Usage:
 *   node scripts/import-messages.mjs /path/to/results.csv
 *   node scripts/import-messages.mjs /path/to/results.csv --local
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const csvPath = process.argv[2];
const isLocal = process.argv.includes("--local");

if (!csvPath) {
  console.error("Usage: node scripts/import-messages.mjs <results.csv> [--local]");
  process.exit(1);
}

function sqlString(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function cleanField(value) {
  if (value == null) return "";
  let s = String(value).trim();
  // Dynamo export sometimes wrapped text in extra quotes
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseApproved(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes" ? 1 : 0;
}

/** Minimal CSV parser that handles quoted fields and newlines inside quotes. */
async function readCsv(filePath) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  const rows = [];
  let headers = null;
  let current = "";
  let inQuotes = false;

  const flushLine = (line) => {
    const cols = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (ch === "," && !q) {
        cols.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    cols.push(cell);
    return cols;
  };

  for await (const line of rl) {
    current = current ? `${current}\n${line}` : line;
    // count quotes
    let quotes = 0;
    for (const ch of current) if (ch === '"') quotes++;
    inQuotes = quotes % 2 === 1;
    if (inQuotes) continue;

    const cols = flushLine(current);
    current = "";
    if (!headers) {
      headers = cols.map((h) => h.trim());
      continue;
    }
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

const rows = await readCsv(path.resolve(csvPath));
console.log(`Parsed ${rows.length} rows from ${csvPath}`);

const statements = rows.map((row) => {
  const sk = cleanField(row.SK);
  const name = cleanField(row.from);
  const message = cleanField(row.message);
  const approved = parseApproved(row.approved);
  const pk = cleanField(row.PK) || "message";
  const origin = cleanField(row.origin) || null;
  const referer = cleanField(row.referer) || null;
  const sourceIp = cleanField(row.sourceIp) || null;
  const userAgent = cleanField(row.userAgent) || null;

  return `INSERT INTO messages
      (name, email, message, created_at, pk, sk, approved, origin, referer, source_ip, user_agent)
    VALUES
      (${sqlString(name)}, NULL, ${sqlString(message)}, ${sqlString(sk)},
       ${sqlString(pk)}, ${sqlString(sk)}, ${approved},
       ${origin == null || origin === "" ? "NULL" : sqlString(origin)},
       ${referer == null || referer === "" ? "NULL" : sqlString(referer)},
       ${sourceIp == null || sourceIp === "" ? "NULL" : sqlString(sourceIp)},
       ${userAgent == null || userAgent === "" ? "NULL" : sqlString(userAgent)})
    ON CONFLICT(sk) DO UPDATE SET
      name=excluded.name,
      message=excluded.message,
      created_at=excluded.created_at,
      pk=excluded.pk,
      approved=excluded.approved,
      origin=excluded.origin,
      referer=excluded.referer,
      source_ip=excluded.source_ip,
      user_agent=excluded.user_agent;`;
});

const sqlPath = path.join(root, "migrations", "_import_messages_data.sql");
await import("node:fs/promises").then((fs) =>
  fs.writeFile(sqlPath, statements.join("\n"), "utf8"),
);
console.log(`Wrote SQL to ${sqlPath}`);

const args = [
  "wrangler",
  "d1",
  "execute",
  "haijie-messages",
  isLocal ? "--local" : "--remote",
  "--file",
  sqlPath,
  "--yes",
];

console.log(`Running: npx ${args.join(" ")}`);
const result = spawnSync("npx", args, {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Import finished.");
