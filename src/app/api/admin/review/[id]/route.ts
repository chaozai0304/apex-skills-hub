import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse, getRuntimeOriginFromRequest } from "@/lib/site";
import { canManageSubmissionProject, getProjectAdminScope, reviewSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

type ReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ReviewRouteContext) {
  const isAdmin = await isAdminAuthenticated();
  const currentUser = isAdmin ? null : await getCurrentUser();
  const projectScope = isAdmin ? [] : await getProjectAdminScope(currentUser?.id);
  if (!isAdmin && !projectScope.length) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const decision = String(formData.get("decision") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const redirectToValue = String(formData.get("redirectTo") ?? "").trim();
  const redirectTo = redirectToValue.startsWith("/my-skills") || redirectToValue.startsWith("/admin")
    ? redirectToValue
    : "/admin?tab=pending";

  if (decision !== "approve" && decision !== "reject") {
    return buildSeeOtherResponse(request, "/admin");
  }

  if (!isAdmin && !(await canManageSubmissionProject(id, projectScope))) {
    return buildSeeOtherResponse(request, appendReviewParam(redirectTo, "skillError", "无权审核该项目的技能"));
  }

  let result: Awaited<ReturnType<typeof reviewSubmission>>;
  try {
    result = await reviewSubmission(id, decision, reviewNotes, {
      actorName: isAdmin ? "superadmin" : currentUser?.username,
      appOrigin: getRuntimeOriginFromRequest(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "审核技能失败。";
    return buildSeeOtherResponse(request, appendReviewParam(redirectTo, "skillError", message));
  }

  const message = decision === "approve"
    ? `已审批发布 ${result.submission.displayName}。`
    : `已驳回 ${result.submission.displayName}，提交人可在“我的技能”中查看状态并修改重提。`;
  const targetUrl = new URL(redirectTo, "http://localhost");
  const params = targetUrl.searchParams;
  const feishuMessage = result.feishuNotification?.message ? `飞书：${result.feishuNotification.message}` : "";

  params.set("skillUpdated", [message, feishuMessage].filter(Boolean).join("\n"));

  if (decision === "approve" && result.gitLabSync.attempted) {
    params.set(
      result.gitLabSync.synced ? "gitlabSyncSuccess" : "gitlabSyncError",
      result.gitLabSync.message || (result.gitLabSync.synced ? "已同步到 GitLab。" : "同步到 GitLab 失败。"),
    );
  }

  return buildSeeOtherResponse(request, `${targetUrl.pathname}?${params.toString()}`);
}

function appendReviewParam(target: string, key: string, value: string) {
  const url = new URL(target, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}
