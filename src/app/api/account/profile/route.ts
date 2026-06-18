import { getCurrentUser, getUserCookieOptions, isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { updateAdminProfile, updateUserAccount } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const accountType = String(formData.get("accountType") ?? "user");
  const displayName = String(formData.get("displayName") ?? "");
  const email = String(formData.get("email") ?? "");
  const roleLabel = String(formData.get("roleLabel") ?? "");
  const organization = String(formData.get("organization") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    if (accountType === "admin") {
      if (!(await isAdminAuthenticated())) {
        return buildSeeOtherResponse(request, "/admin/login?next=/admin");
      }
      await updateAdminProfile({ displayName, email });
      return buildSeeOtherResponse(request, "/admin?userUpdated=1");
    }

    const user = await getCurrentUser();
    if (!user) {
      return buildSeeOtherResponse(request, "/login");
    }

    const updated = await updateUserAccount({ userId: user.id, displayName, email, roleLabel, organization, password, actorName: user.username });
    const response = buildSeeOtherResponse(request, "/my-skills?profileUpdated=1");
    response.cookies.set(getUserCookieOptions(updated, request));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存账户信息失败。";
    return buildSeeOtherResponse(request, `/admin?userError=${encodeURIComponent(message)}`);
  }
}
