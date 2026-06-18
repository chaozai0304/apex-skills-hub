import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { deleteGitLabSyncProject, testGitLabSyncConnection, updateGitLabSyncConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin?tab=sync");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");
  const projectId = String(formData.get("projectId") ?? "");
  const projectName = String(formData.get("projectName") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "on";
  const repositoryTreeUrl = String(formData.get("repositoryTreeUrl") ?? "");
  const branch = String(formData.get("branch") ?? "");
  const token = String(formData.get("token") ?? "");
  const adminUserIds = formData.getAll("adminUserIds").map(String);
  const notifyEmails = formData.getAll("notifyEmails").map(String);

  try {
    if (intent === "delete") {
      await deleteGitLabSyncProject(projectId);
      return buildSeeOtherResponse(request, "/admin?tab=sync&syncSaved=1");
    }

    if (intent === "test") {
      const result = await testGitLabSyncConnection({
        projectId,
        repositoryTreeUrl,
        branch,
        token,
      });

      return buildSeeOtherResponse(
        request,
        `/admin?tab=sync&syncTestSuccess=${encodeURIComponent(result.message)}`,
      );
    }

    if (intent === "resetToken") {
      await updateGitLabSyncConfig({
        projectId,
        projectName,
        enabled: false,
        repositoryTreeUrl,
        branch,
        clearToken: true,
        adminUserIds,
        notifyEmails,
      });

      return buildSeeOtherResponse(request, "/admin?tab=sync&syncTokenReset=1");
    }

    await updateGitLabSyncConfig({
      projectId,
      projectName,
      enabled,
      repositoryTreeUrl,
      branch,
      token,
      adminUserIds,
      notifyEmails,
    });

    return buildSeeOtherResponse(request, "/admin?tab=sync&syncSaved=1");
  } catch (error) {
    const fallbackMessage =
      intent === "test" ? "测试 GitLab 连通性失败。" : "保存 GitLab 同步配置失败。";
    const message = error instanceof Error ? error.message : fallbackMessage;
    const queryKey = intent === "test" ? "syncTestError" : "syncError";
    return buildSeeOtherResponse(
      request,
      `/admin?tab=sync&${queryKey}=${encodeURIComponent(message)}`,
    );
  }
}
