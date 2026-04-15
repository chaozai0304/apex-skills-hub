import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { deleteSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin");
  }

  const { id } = await params;
  const formData = await request.formData();
  const redirectToValue = String(formData.get("redirectTo") ?? "").trim();
  const redirectTo = redirectToValue.startsWith("/admin") ? redirectToValue : "/admin?tab=skills&page=1";
  const redirectUrl = new URL(redirectTo, "http://localhost");

  try {
    await deleteSubmission(id, "superadmin");
    redirectUrl.searchParams.set("skillDeleted", "1");
    return buildSeeOtherResponse(request, `${redirectUrl.pathname}?${redirectUrl.searchParams.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除技能失败。";
    redirectUrl.searchParams.set("skillError", message);
    return buildSeeOtherResponse(request, `${redirectUrl.pathname}?${redirectUrl.searchParams.toString()}`);
  }
}
