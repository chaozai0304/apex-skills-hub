import { NextResponse } from "next/server";

import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import {
  canManageSubmissionProject,
  getProjectAdminScope,
  getSubmissionById,
  readArchive,
} from "@/lib/store";

export const dynamic = "force-dynamic";

type AdminSubmissionDownloadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: AdminSubmissionDownloadRouteContext) {
  const { id } = await context.params;
  const isAdmin = await isAdminAuthenticated();
  const currentUser = isAdmin ? null : await getCurrentUser();
  const projectScope = isAdmin ? [] : await getProjectAdminScope(currentUser?.id);

  if (!isAdmin && !projectScope.length) {
    return NextResponse.json({ error: "未登录或无权下载该技能包。" }, { status: 403 });
  }

  if (!isAdmin && !(await canManageSubmissionProject(id, projectScope))) {
    return NextResponse.json({ error: "你没有权限下载该技能包。" }, { status: 403 });
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "未找到可下载的技能包。" }, { status: 404 });
  }

  const archive = await readArchive(submission);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${submission.slug}-${submission.version}.zip"`,
    },
  });
}
