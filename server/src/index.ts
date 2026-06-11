// Backup/restore API for Simple Workout.
// Three routes, username/password (HTTP Basic) auth, full JSON snapshots in D1.
// Each backup is owned by the authenticated user; users never see each other's.

interface Env {
  DB: D1Database;
  // JSON map of username -> password, e.g. {"ironborn":"dungeonfit"}.
  BACKUP_USERS: string;
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

// Constant-time string compare. Length mismatch returns early (an acceptable
// leak); timingSafeEqual throws on unequal-length buffers.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

// Returns the authenticated username, or null if the credentials don't match
// any account in the BACKUP_USERS map.
function authenticate(request: Request, env: Env): string | null {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  let users: Record<string, string>;
  try {
    users = JSON.parse(env.BACKUP_USERS);
  } catch {
    return null;
  }
  const expected = users[user];
  // Compare against a dummy when the user is unknown so timing doesn't reveal
  // which usernames exist.
  const ok = safeEqual(pass, typeof expected === "string" ? expected : "\0");
  return ok && typeof expected === "string" ? user : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const user = authenticate(request, env);
    if (!user) {
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
          `INSERT INTO backups (username, schema_version, app_version, size_bytes, payload)
           VALUES (?, ?, ?, ?, ?)
           RETURNING id, created_at`
        )
          .bind(user, body.version, null, text.length, text)
          .first<{ id: number; created_at: string }>();

        // Keep only this user's most recent backups.
        await env.DB.prepare(
          `DELETE FROM backups
           WHERE username = ?
             AND id NOT IN (
               SELECT id FROM backups WHERE username = ? ORDER BY id DESC LIMIT ?
             )`
        )
          .bind(user, user, KEEP_BACKUPS)
          .run();

        return json(result, 201, cors);
      }

      if (request.method === "GET" && url.pathname === "/backups/latest") {
        const row = await env.DB.prepare(
          "SELECT payload FROM backups WHERE username = ? ORDER BY id DESC LIMIT 1"
        )
          .bind(user)
          .first<{ payload: string }>();
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
           FROM backups WHERE username = ? ORDER BY id DESC LIMIT ?`
        )
          .bind(user, KEEP_BACKUPS)
          .all();
        return json(rows.results, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: String(err) }, 500, cors);
    }
  }
};
