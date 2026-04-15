import { getCurrentUser } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { changeUserPassword } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return buildSeeOtherResponse(request, "/login?next=/my-skills");
  }

  const formData = await request.formData();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (nextPassword !== confirmPassword) {
    return buildSeeOtherResponse(
      request,
      `/my-skills?accountError=${encodeURIComponent("两次输入的新密码不一致。")}`,
    );
  }

  try {
    await changeUserPassword(user.id, currentPassword, nextPassword);
    return buildSeeOtherResponse(request, "/my-skills?accountSuccess=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "密码修改失败。";
    return buildSeeOtherResponse(request, `/my-skills?accountError=${encodeURIComponent(message)}`);
  }
}
