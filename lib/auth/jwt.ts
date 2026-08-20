import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/models/User";

// No `next/headers` import here on purpose — this file is imported by both
// proxy.ts (edge runtime, request.cookies only) and lib/auth/session.ts
// (Node runtime, next/headers cookies()). Keeping the JWT primitives
// separate from the next/headers-dependent cookie-writing code keeps
// proxy.ts's bundle edge-safe.
export const SESSION_COOKIE_NAME = "horeca_session";

const secretKey = process.env.SESSION_SECRET || "dev-insecure-secret-change-me-in-production";
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: string;
  nama: string;
  role: UserRole;
  [key: string]: unknown;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decryptSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
