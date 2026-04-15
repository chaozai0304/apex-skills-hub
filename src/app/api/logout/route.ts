import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  getExpiredCookieOptions,
} from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const next = String(formData.get("next") ?? "/");
  const response = buildSeeOtherResponse(request, next);
  response.cookies.set(getExpiredCookieOptions(USER_COOKIE_NAME, request));
  response.cookies.set(getExpiredCookieOptions(ADMIN_COOKIE_NAME, request));
  return response;
}
