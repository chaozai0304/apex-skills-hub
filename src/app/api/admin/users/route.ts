import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { createUserAccount, updateUserStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");

  try {
    if (intent === "toggle") {
      const userId = String(formData.get("userId") ?? "");
      const disabled = String(formData.get("disabled") ?? "false") === "true";
      await updateUserStatus(userId, disabled, "superadmin");
      return buildSeeOtherResponse(request, "/admin?userUpdated=1");
    }

    await createUserAccount({
      username: String(formData.get("username") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      password: String(formData.get("password") ?? ""),
      createdBy: "superadmin",
    });

    return buildSeeOtherResponse(request, "/admin?userCreated=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建用户失败。";
    return buildSeeOtherResponse(request, `/admin?userError=${encodeURIComponent(message)}`);
  }
}
