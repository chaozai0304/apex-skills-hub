import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { createUserAccount, deleteUserAccounts, importUserAccountsFromCsv, updateUserAccount, updateUserStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const csv = "username,email,displayName,password,roleLabel,organization\nzhangsan,zhangsan@example.com,张三,ChangeMe_123,研发负责人,AI平台部\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=apex-users-template.csv",
    },
  });
}

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

    if (intent === "update") {
      await updateUserAccount({
        userId: String(formData.get("userId") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
        roleLabel: String(formData.get("roleLabel") ?? ""),
        organization: String(formData.get("organization") ?? ""),
        password: String(formData.get("password") ?? ""),
        actorName: "superadmin",
      });
      return buildSeeOtherResponse(request, "/admin?tab=users&userUpdated=1");
    }

    if (intent === "deleteMany") {
      const count = await deleteUserAccounts(formData.getAll("userIds").map(String), "superadmin");
      return buildSeeOtherResponse(request, `/admin?tab=users&userUpdated=${encodeURIComponent(`已删除 ${count} 个用户`)}`);
    }

    if (intent === "import") {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new Error("请上传 CSV 文件。");
      }
      const count = await importUserAccountsFromCsv(await file.text(), "superadmin");
      return buildSeeOtherResponse(request, `/admin?tab=users&userUpdated=${encodeURIComponent(`已导入 ${count} 个用户`)}`);
    }

    await createUserAccount({
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      password: String(formData.get("password") ?? ""),
      roleLabel: String(formData.get("roleLabel") ?? ""),
      organization: String(formData.get("organization") ?? ""),
      createdBy: "superadmin",
    });

    return buildSeeOtherResponse(request, "/admin?tab=users&userCreated=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建用户失败。";
    return buildSeeOtherResponse(request, `/admin?tab=users&userError=${encodeURIComponent(message)}`);
  }
}
