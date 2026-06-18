import { getAdminCookieOptions, validateAdminLogin } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!validateAdminLogin(username, password)) {
    return buildSeeOtherResponse(
      request,
      `/admin/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("用户名或密码不正确。")}`,
    );
  }

  const response = buildSeeOtherResponse(request, next);
  const cookie = getAdminCookieOptions(request);
  response.cookies.set(cookie);
  return response;
}
