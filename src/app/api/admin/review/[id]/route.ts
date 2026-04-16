import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { reviewSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

type ReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ReviewRouteContext) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const decision = String(formData.get("decision") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");

  if (decision !== "approve" && decision !== "reject") {
    return buildSeeOtherResponse(request, "/admin");
  }

  const result = await reviewSubmission(id, decision, reviewNotes);

  if (decision === "approve" && result.gitLabSync.attempted) {
    if (result.gitLabSync.synced) {
      return buildSeeOtherResponse(
        request,
        `/admin?tab=pending&gitlabSyncSuccess=${encodeURIComponent(result.gitLabSync.message || "已同步到 GitLab。")}`,
      );
    }

    return buildSeeOtherResponse(
      request,
      `/admin?tab=pending&gitlabSyncError=${encodeURIComponent(result.gitLabSync.message || "同步到 GitLab 失败。")}`,
    );
  }

  return buildSeeOtherResponse(request, "/admin?tab=pending");
}
