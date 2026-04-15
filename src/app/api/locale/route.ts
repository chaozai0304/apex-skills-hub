import { NextResponse } from "next/server";

import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n";
import { buildRedirectUrl } from "@/lib/site";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));
  const next = searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const response = NextResponse.redirect(buildRedirectUrl(request, safeNext), { status: 303 });

  response.cookies.set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
