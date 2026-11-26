import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import db from "./db";

const cookieName = "aurum_session";

export async function createSession() {
  const crypto = await import("node:crypto");
  const id = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
  db.prepare("INSERT INTO sessions (id,expires_at,created_at) VALUES (?,?,?)")
    .run(id, expires, Date.now());
  (await cookies()).set(cookieName, id, {
    httpOnly: true,
    secure: process.env.AURUM_SECURE_COOKIES === "true",
    sameSite: "strict",
    expires: new Date(expires),
    path: "/",
  });
  return id;
}

export async function isAuthenticated() {
  const id = (await cookies()).get(cookieName)?.value;
  if (!id) return false;
  const session = db.prepare("SELECT * FROM sessions WHERE id=? AND expires_at>?")
    .get(id, Date.now()) as { id: string } | undefined;
  return Boolean(session);
}

export async function clearSession() {
  const id = (await cookies()).get(cookieName)?.value;
  if (id) db.prepare("DELETE FROM sessions WHERE id=?").run(id);
  (await cookies()).delete(cookieName);
}

export async function revokeAllSessions() {
  db.prepare("DELETE FROM sessions").run();
  await clearSession();
}

export async function validateAccessCode(code: string) {
  const hash = process.env.AURUM_ACCESS_CODE_HASH;
  if (!hash) {
    throw new Error("AURUM_ACCESS_CODE_HASH must be configured before authentication is enabled.");
  }
  return bcrypt.compare(code, hash);
}
