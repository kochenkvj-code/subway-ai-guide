import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.STATS_ADMIN_PASSWORD || "";
const cookieName = "sag_stats_session";
export { cookieName };
const signature = (value) => createHmac("sha256", secret()).update(value).digest("hex");
export function authorized(request) {
  if (!secret()) return false;
  const raw = request.cookies.get(cookieName)?.value || "";
  const [expiry, sig] = raw.split(".");
  if (!/^\d{10,13}$/.test(expiry || "") || !/^[a-f0-9]{64}$/.test(sig || "")) return false;
  if (Number(expiry) < Date.now()) return false;
  return timingSafeEqual(Buffer.from(signature(expiry)), Buffer.from(sig));
}
export function verifyPassword(input) {
  const expected = secret();
  if (!expected || typeof input !== "string") return false;
  const a = createHmac("sha256", "stats-password-check").update(input).digest();
  const b = createHmac("sha256", "stats-password-check").update(expected).digest();
  return timingSafeEqual(a, b);
}
export function newSession() {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return expiry + "." + signature(expiry);
}
export async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Statistics database is not configured");
  const response = await fetch(url + "/rest/v1/" + path, {
    ...options,
    headers: { apikey: key, "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Statistics database request failed: " + response.status);
  return response;
}
