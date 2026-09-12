/**
 * Pocket Lab hourglass rewards — pure logic, no DB.
 *
 * Finishing a workout mints one grant: a random 8-char key, an hourglass
 * count and a signed claim code that Pocket Lab can verify offline. The
 * Cloudflare Worker ledger and the claim code carry the SAME key, so Pocket
 * Lab can dedupe across both paths and a session is never credited twice.
 *
 * Contract shared with Pocket Lab (dist/economy.js there) — keep in sync:
 *   key      8 chars, Crockford base32 alphabet, uppercase
 *   code     HG-<KEY8>-<hourglasses decimal>-<SIG6>
 *   SIG6     first 6 chars of Crockford-base32(HMAC-SHA-256(secret, "KEY8|n"))
 */

export const HOURGLASS_PER_WORKOUT = 12;
export const HOURGLASS_PER_LEVEL_UP = 6;
export const HOURGLASS_STREAK_BONUS = 12;
export const STREAK_BONUS_EVERY = 7;
/** TCG Pocket rule: 12 hourglasses open one pack (display only here). */
export const HOURGLASSES_PER_PACK = 12;
/** Mirrors the worker's validation. */
export const MAX_HOURGLASSES_PER_GRANT = 200;

// Personal app: the secret ships in both client bundles by design.
export const CLAIM_SECRET = "simple-workout/pocket-lab/hourglass/v1";
/** Crockford base32: no I, L, O, U — nothing to misread off a phone screen. */
export const GRANT_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const GRANT_KEY_LENGTH = 8;

export type RewardKind = "workout" | "level_ups" | "streak";
export type RewardLine = { kind: RewardKind; label: string; amount: number };
export type RewardCalc = { total: number; breakdown: RewardLine[] };

function nonNegInt(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * levelUps: number of ladder promotions in this session.
 * streak:   current streak AFTER this session was recorded.
 * firstSessionOfDay: false suppresses the streak bonus (streaks count days,
 *   so a second workout on the same day must not earn the bonus again).
 */
export function computeReward(input: { levelUps: number; streak: number; firstSessionOfDay?: boolean }): RewardCalc {
  const levelUps = nonNegInt(input.levelUps);
  const streak = nonNegInt(input.streak);
  const first = input.firstSessionOfDay ?? true;
  const breakdown: RewardLine[] = [{ kind: "workout", label: "Workout", amount: HOURGLASS_PER_WORKOUT }];
  if (levelUps > 0) {
    breakdown.push({
      kind: "level_ups",
      label: levelUps === 1 ? "Level-up" : `Level-ups ×${levelUps}`,
      amount: HOURGLASS_PER_LEVEL_UP * levelUps
    });
  }
  if (first && streak > 0 && streak % STREAK_BONUS_EVERY === 0) {
    breakdown.push({ kind: "streak", label: `${streak}-streak bonus`, amount: HOURGLASS_STREAK_BONUS });
  }
  const total = Math.min(MAX_HOURGLASSES_PER_GRANT, breakdown.reduce((s, l) => s + l.amount, 0));
  return { total, breakdown };
}

// ---------------------------------------------------------------------------
// Grant keys
// ---------------------------------------------------------------------------

function defaultRandom(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** 8 random Crockford chars (40 bits). `rand` is injectable for tests. */
export function newGrantKey(rand: (n: number) => Uint8Array = defaultRandom): string {
  let out = "";
  while (out.length < GRANT_KEY_LENGTH) {
    for (const byte of rand(GRANT_KEY_LENGTH)) {
      // Rejection sampling: 224 = 7 × 32, so `% 32` stays unbiased.
      if (byte >= 224) continue;
      out += GRANT_KEY_ALPHABET[byte % 32];
      if (out.length === GRANT_KEY_LENGTH) break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Claim codes
// ---------------------------------------------------------------------------

/** MSB-first 5-bit groups, no padding; a trailing partial group is left-shifted. */
export function encodeBase32Crockford(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let val = 0;
  for (const b of bytes) {
    val = ((val << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += GRANT_KEY_ALPHABET[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += GRANT_KEY_ALPHABET[(val << (5 - bits)) & 31];
  return out;
}

export function claimCanonical(grantKey: string, hourglasses: number): string {
  return `${grantKey}|${hourglasses}`;
}

/** Web Crypto needs a secure context; `vite --host` over plain http on a LAN has none. */
export function canClaimCodesHere(): boolean {
  return Boolean(globalThis.crypto?.subtle);
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto is unavailable on this page.");
  const enc = new TextEncoder();
  const key = await subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", key, enc.encode(message)));
}

export async function claimSignature(grantKey: string, hourglasses: number, secret = CLAIM_SECRET): Promise<string> {
  const mac = await hmacSha256(secret, claimCanonical(grantKey, hourglasses));
  return encodeBase32Crockford(mac).slice(0, 6);
}

export async function makeClaimCode(grantKey: string, hourglasses: number, secret = CLAIM_SECRET): Promise<string> {
  return `HG-${grantKey}-${hourglasses}-${await claimSignature(grantKey, hourglasses, secret)}`;
}

const CONFUSABLE: Record<string, string> = { O: "0", I: "1", L: "1", U: "V" };

function normaliseSegment(s: string): string {
  return s.replace(/[OILU]/g, (c) => CONFUSABLE[c]);
}

function inAlphabet(s: string): boolean {
  for (const c of s) if (!GRANT_KEY_ALPHABET.includes(c)) return false;
  return true;
}

/** Format check + normalisation only; does not verify the signature. */
export function parseClaimCode(raw: string): { grantKey: string; hourglasses: number; sig: string } | null {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const m = /^HG-([0-9A-Z]{8})-(\d{1,3})-([0-9A-Z]{6})$/.exec(s);
  if (!m) return null;
  const grantKey = normaliseSegment(m[1]);
  const sig = normaliseSegment(m[3]);
  const hourglasses = Number(m[2]);
  if (hourglasses < 1 || hourglasses > MAX_HOURGLASSES_PER_GRANT) return null;
  if (!inAlphabet(grantKey) || !inAlphabet(sig)) return null;
  return { grantKey, hourglasses, sig };
}

export async function verifyClaimCode(raw: string, secret = CLAIM_SECRET): Promise<{ grantKey: string; hourglasses: number } | null> {
  const parsed = parseClaimCode(raw);
  if (!parsed) return null;
  const expected = await claimSignature(parsed.grantKey, parsed.hourglasses, secret);
  return expected === parsed.sig ? { grantKey: parsed.grantKey, hourglasses: parsed.hourglasses } : null;
}
