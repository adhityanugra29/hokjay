import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { encryptSession, decryptSession, SESSION_COOKIE_NAME, type SessionPayload } from "./jwt";
import type { UserRole } from "@/models/User";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(user: { id: string; nama: string; role: UserRole }) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encryptSession({ userId: user.id, nama: user.nama, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Cached per-request — read the session cookie, redirecting to /login if absent/invalid. */
export const requireSession = cache(async (): Promise<SessionPayload> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  if (!session?.userId) redirect("/login");
  return session;
});

/** Same as requireSession but returns null instead of redirecting — for optional UI (e.g. showing who's logged in). */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(token);
});
