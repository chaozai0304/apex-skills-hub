import { cookies } from "next/headers";

import { getAdminCredentials } from "@/lib/config";
import { getUserById } from "@/lib/store";
import { sha256 } from "@/lib/security";
import type { UserRecord } from "@/lib/types";

export const ADMIN_COOKIE_NAME = "apex-skills-hub-admin";
export const USER_COOKIE_NAME = "apex-skills-hub-user";

export function validateAdminLogin(username: string, password: string) {
  const creds = getAdminCredentials();
  return username === creds.username && password === creds.password;
}

export function createAdminSessionToken() {
  const creds = getAdminCredentials();
  return sha256(`${creds.username}:${creds.password}:${creds.sessionSecret}`);
}

export function createUserSessionToken(user: Pick<UserRecord, "id" | "passwordHash">) {
  const creds = getAdminCredentials();
  return sha256(`${user.id}:${user.passwordHash}:${creds.sessionSecret}`);
}

export function buildUserCookieValue(user: Pick<UserRecord, "id" | "passwordHash">) {
  return `${user.id}.${createUserSessionToken(user)}`;
}

function shouldUseSecureCookies(request: Request) {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") {
    return true;
  }

  if (override === "false") {
    return false;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === createAdminSessionToken();
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  const [userId, token] = raw.split(".");
  if (!userId || !token) {
    return null;
  }

  const user = await getUserById(userId);
  if (!user || user.disabled) {
    return null;
  }

  return createUserSessionToken(user) === token ? user : null;
}

export function getAdminCookieOptions(request: Request) {
  return {
    name: ADMIN_COOKIE_NAME,
    value: createAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function getUserCookieOptions(
  user: Pick<UserRecord, "id" | "passwordHash">,
  request: Request,
) {
  return {
    name: USER_COOKIE_NAME,
    value: buildUserCookieValue(user),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function getExpiredCookieOptions(name: string, request: Request) {
  return {
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0,
  };
}
