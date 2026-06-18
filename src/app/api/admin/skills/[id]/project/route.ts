import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { canManageSubmissionProject, getProjectAdminScope, switchSkillProject } from "@/lib/store";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const isAdmin = await isAdminAuthenticated();
  const currentUser = isAdmin ? null : await getCurrentUser();
  const projectScope = isAdmin ? [] : await getProjectAdminScope(currentUser?.id);

  if (!isAdmin && !projectScope.length) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const { id } = await params;
  const formData = await request.formData();
  const redirectToValue = String(formData.get("redirectTo") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const redirectTo = redirectToValue.startsWith("/admin") ? redirectToValue : "/admin?tab=skills&page=1";
  const redirectUrl = new URL(redirectTo, "http://localhost");

  try {
    if (!isAdmin && !(await canManageSubmissionProject(id, projectScope))) {
      throw new Error("无权切换该项目的技能。");
    }

    if (!projectId) {
      throw new Error("请选择新的项目。");
    }

    if (!isAdmin && !projectScope.includes(projectId)) {
      throw new Error("只能切换到你管理的项目。");
    }

    const result = await switchSkillProject(id, projectId, isAdmin ? "superadmin" : currentUser?.username);
    redirectUrl.searchParams.set(
      "skillDeleted",
      result.movedCount
        ? `已将技能 ${result.displayName} 切换到项目 ${result.projectName}，共 ${result.movedCount} 个版本。`
        : result.gitLabSync.message ?? "项目未变化。",
    );

    if (result.gitLabSync.attempted) {
      if (result.gitLabSync.synced) {
        redirectUrl.searchParams.set("gitlabSyncSuccess", result.gitLabSync.message ?? "已同步到新 GitLab 项目。");
      } else if (result.gitLabSync.message) {
        redirectUrl.searchParams.set("gitlabSyncError", result.gitLabSync.message);
      }
    }

    return buildSeeOtherResponse(request, `${redirectUrl.pathname}?${redirectUrl.searchParams.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "切换技能项目失败。";
    redirectUrl.searchParams.set("skillError", message);
    return buildSeeOtherResponse(request, `${redirectUrl.pathname}?${redirectUrl.searchParams.toString()}`);
  }
}
