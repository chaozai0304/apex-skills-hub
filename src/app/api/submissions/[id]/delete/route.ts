import { getCurrentUser } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { deleteUserRejectedSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return buildSeeOtherResponse(request, "/login?next=/my-skills");
  }

  const { id } = await params;

  try {
    const deleted = await deleteUserRejectedSubmission(id, user);
    return buildSeeOtherResponse(
      request,
      `/my-skills?skillDeleted=${encodeURIComponent(`已删除技能提交 ${deleted.displayName}。`)}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除技能失败。";
    return buildSeeOtherResponse(
      request,
      `/my-skills?skillError=${encodeURIComponent(message)}`,
    );
  }
}
