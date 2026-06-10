// Backup/restore API for Simple Workout.
// Three routes, Bearer-token auth, full JSON snapshots stored in D1.

interface Env {
  DB: D1Database;
  BACKUP_TOKEN: string;
}

const ALLOWED_ORIGINS = [
  "https://rishi-goyal.github.io",
  "http://localhost:5173"
];

const MAX_PAYLOAD_BYTES = 1_900_000; // D1 caps a TEXT value at ~2 MB
const KEEP_BACKUPS = 20;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const enc = new TextEncoder();
  const a = enc.encode(token);
  const b = enc.encode(env.BACKUP_TOKEN);
  // timingSafeEqual throws on unequal lengths; a length leak is acceptable here.
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!isAuthorized(request, env)) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/backups") {
        const text = await request.text();
        if (text.length > MAX_PAYLOAD_BYTES) {
          return json({ error: "backup too large" }, 413, cors);
        }
        let body: { version?: number; tables?: unknown };
        try {
          body = JSON.parse(text);
        } catch {
          return json({ error: "invalid JSON" }, 400, cors);
        }
        if (body.version !== 1 || typeof body.tables !== "object" || body.tables === null) {
          return json({ error: "unsupported backup format" }, 400, cors);
        }

        const result = await env.DB.prepare(
          `INSERT INTO backups (schema_version, app_version, size_bytes, payload)
           VALUES (?, ?, ?, ?)
           RETURNING id, created_at`
        )
          .bind(body.version, null, text.length, text)
          .first<{ id: number; created_at: string }>();

        await env.DB.prepare(
          `DELETE FROM backups
           WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT ?)`
        )
          .bind(KEEP_BACKUPS)
          .run();

        return json(result, 201, cors);
      }

      if (request.method === "GET" && url.pathname === "/backups/latest") {
        const row = await env.DB.prepare(
          "SELECT payload FROM backups ORDER BY id DESC LIMIT 1"
        ).first<{ payload: string }>();
        if (!row) {
          return json({ error: "no backups" }, 404, cors);
        }
        // Payload is already JSON text — return it verbatim.
        return new Response(row.payload, {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors }
        });
      }

      if (request.method === "GET" && url.pathname === "/backups") {
        const rows = await env.DB.prepare(
          `SELECT id, created_at, schema_version, app_version, size_bytes
           FROM backups ORDER BY id DESC LIMIT ?`
        )
          .bind(KEEP_BACKUPS)
          .all();
        return json(rows.results, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: String(err) }, 500, cors);
    }
  }
};
