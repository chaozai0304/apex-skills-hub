import { getUserCookieOptions } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { authenticateUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/my-skills");

  const user = await authenticateUser(username, password);
  if (!user) {
    return buildSeeOtherResponse(
      request,
      `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("用户名或密码不正确。")}`,
    );
  }

  const response = buildSeeOtherResponse(request, next);
  response.cookies.set(getUserCookieOptions(user, request));
  return response;
}
