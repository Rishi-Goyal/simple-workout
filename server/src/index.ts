// Backup/restore API for Simple Workout, plus the Pocket Lab hourglass ledger.
// Username/password (HTTP Basic) auth; every row is owned by the authenticated
// user and users never see each other's data.
//
// Backups:      POST /backups, GET /backups/latest, GET /backups
// Hourglasses:  POST /hourglasses/grants   (workout app, after a session)
//               GET  /hourglasses/pending  (Pocket Lab, unclaimed grants)
//               POST /hourglasses/claim    (Pocket Lab, marks grants claimed)
//               GET  /hourglasses/summary  (workout app, totals)

interface Env {
  DB: D1Database;
  // JSON map of username -> password, e.g. {"ironborn":"dungeonfit"}.
  BACKUP_USERS: string;
}

const ALLOWED_ORIGINS = [
  "https://rishi-goyal.github.io",
  "http://localhost:5173",
  // Pocket Lab runs from its own local static server.
  "http://127.0.0.1:4173",
  "http://localhost:4173"
];

const MAX_PAYLOAD_BYTES = 1_900_000; // D1 caps a TEXT value at ~2 MB
const KEEP_BACKUPS = 20;

const MAX_HOURGLASS_BODY_BYTES = 65_536;
const MAX_HOURGLASSES = 200;
// D1 allows 100 bound parameters per statement; IN (...) lists are chunked.
const IN_CHUNK = 90;
const MAX_GRANTS_PER_POST = 500;
const MAX_CLAIM_KEYS = 500;
const MAX_BREAKDOWN_CHARS = 2000;

// Exactly what the workout app mints: 8 chars, Crockford base32 (no I L O U).
// Pocket Lab dedupes on this key, so nothing wider may enter the ledger.
const GRANT_KEY_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type GrantIn = { grant_key: string; session_date: string; hourglasses: number; breakdown_json: string };

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
    // Clients UTF-8 encode "user:password" before base64 (plain btoa cannot
    // carry characters above U+00FF); decode the bytes back the same way.
    const bin = atob(header.slice(6));
    decoded = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
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

async function readJson(
  request: Request,
  maxBytes: number,
  cors: Record<string, string>
): Promise<{ body: unknown } | { error: Response }> {
  const text = await request.text();
  if (text.length > maxBytes) return { error: json({ error: "body too large" }, 413, cors) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: json({ error: "invalid JSON" }, 400, cors) };
  }
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function parseBreakdown(text: string): unknown[] {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Validates one grant from the workout app; returns an error string or null.
function cleanGrant(raw: unknown): GrantIn | string {
  if (!raw || typeof raw !== "object") return "grant must be an object";
  const g = raw as Record<string, unknown>;
  if (typeof g.grant_key !== "string" || !GRANT_KEY_RE.test(g.grant_key)) return "bad grant_key";
  if (typeof g.session_date !== "string" || !ISO_DATE_RE.test(g.session_date)) return "bad session_date";
  if (typeof g.hourglasses !== "number" || !Number.isInteger(g.hourglasses) || g.hourglasses < 1 || g.hourglasses > MAX_HOURGLASSES) {
    return `hourglasses must be an integer 1..${MAX_HOURGLASSES}`;
  }
  let breakdown_json = JSON.stringify(Array.isArray(g.breakdown) ? g.breakdown : []);
  if (breakdown_json.length > MAX_BREAKDOWN_CHARS) breakdown_json = "[]";
  return { grant_key: g.grant_key, session_date: g.session_date, hourglasses: g.hourglasses, breakdown_json };
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
        // v1: original 7 tables · v2: + v2_* tables · v3: + v2_rewards.
        if (![1, 2, 3].includes(body.version as number) || typeof body.tables !== "object" || body.tables === null) {
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

      // ---- Pocket Lab hourglass ledger -------------------------------------

      if (request.method === "POST" && url.pathname === "/hourglasses/grants") {
        const parsed = await readJson(request, MAX_HOURGLASS_BODY_BYTES, cors);
        if ("error" in parsed) return parsed.error;
        const grants = (parsed.body as { grants?: unknown } | null)?.grants;
        if (!Array.isArray(grants) || grants.length === 0 || grants.length > MAX_GRANTS_PER_POST) {
          return json({ error: `grants must be an array of 1..${MAX_GRANTS_PER_POST}` }, 400, cors);
        }
        const clean: GrantIn[] = [];
        for (let i = 0; i < grants.length; i++) {
          const g = cleanGrant(grants[i]);
          if (typeof g === "string") return json({ error: `invalid grant at index ${i}: ${g}` }, 400, cors);
          clean.push(g);
        }

        // INSERT OR IGNORE: the UNIQUE(username, grant_key) makes re-sends harmless.
        const results = await env.DB.batch(
          clean.map((g) =>
            env.DB.prepare(
              `INSERT OR IGNORE INTO hourglass_grants (username, grant_key, session_date, hourglasses, breakdown_json)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(user, g.grant_key, g.session_date, g.hourglasses, g.breakdown_json)
          )
        );
        const inserted = results.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);

        // Return every key that now exists (not just newly inserted ones) so a
        // client that lost an earlier ACK can still mark its rows synced.
        const accepted: string[] = [];
        for (const keys of chunk(clean.map((g) => g.grant_key), IN_CHUNK)) {
          const rows = await env.DB.prepare(
            `SELECT grant_key FROM hourglass_grants WHERE username = ? AND grant_key IN (${placeholders(keys.length)})`
          )
            .bind(user, ...keys)
            .all<{ grant_key: string }>();
          for (const r of rows.results) accepted.push(r.grant_key);
        }
        return json({ accepted, inserted }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/hourglasses/pending") {
        const rows = await env.DB.prepare(
          `SELECT grant_key, session_date, hourglasses, breakdown_json, created_at
           FROM hourglass_grants WHERE username = ? AND claimed_at IS NULL ORDER BY id`
        )
          .bind(user)
          .all<{ grant_key: string; session_date: string; hourglasses: number; breakdown_json: string; created_at: string }>();
        const grants = rows.results.map((r) => ({
          grant_key: r.grant_key,
          session_date: r.session_date,
          hourglasses: r.hourglasses,
          breakdown: parseBreakdown(r.breakdown_json),
          created_at: r.created_at
        }));
        return json({ grants }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/hourglasses/claim") {
        const parsed = await readJson(request, MAX_HOURGLASS_BODY_BYTES, cors);
        if ("error" in parsed) return parsed.error;
        const keys = (parsed.body as { grant_keys?: unknown } | null)?.grant_keys;
        if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_CLAIM_KEYS) {
          return json({ error: `grant_keys must be an array of 1..${MAX_CLAIM_KEYS}` }, 400, cors);
        }
        if (!keys.every((k) => typeof k === "string" && GRANT_KEY_RE.test(k))) {
          return json({ error: "bad grant_key" }, 400, cors);
        }

        // `claimed_at IS NULL` is evaluated inside the write, so two racing
        // claims can't both flip the same row; only rows flipped by THIS call
        // are returned. Unknown or already-claimed keys are absent. All chunks
        // run in one batch so a claim is all-or-nothing.
        const claimedAt = new Date().toISOString();
        const results = await env.DB.batch(
          chunk(keys as string[], IN_CHUNK).map((part) =>
            env.DB.prepare(
              `UPDATE hourglass_grants SET claimed_at = ?
               WHERE username = ? AND claimed_at IS NULL AND grant_key IN (${placeholders(part.length)})
               RETURNING grant_key, hourglasses`
            ).bind(claimedAt, user, ...part)
          )
        );
        const claimed = results.flatMap((r) => (r.results ?? []) as { grant_key: string; hourglasses: number }[]);
        const credited = claimed.reduce((n, r) => n + r.hourglasses, 0);
        return json({ credited, keys: claimed.map((r) => r.grant_key), claimed_at: claimedAt }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/hourglasses/summary") {
        const row = await env.DB.prepare(
          `SELECT COUNT(*) AS grants,
                  COALESCE(SUM(hourglasses), 0) AS earned,
                  COALESCE(SUM(CASE WHEN claimed_at IS NOT NULL THEN hourglasses ELSE 0 END), 0) AS claimed
           FROM hourglass_grants WHERE username = ?`
        )
          .bind(user)
          .first<{ grants: number; earned: number; claimed: number }>();
        const earned = Number(row?.earned ?? 0);
        const claimedTotal = Number(row?.claimed ?? 0);
        return json({ earned, claimed: claimedTotal, pending: earned - claimedTotal, grants: Number(row?.grants ?? 0) }, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: String(err) }, 500, cors);
    }
  }
};
