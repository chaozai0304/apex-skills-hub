import { NextResponse } from "next/server";

import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { getRuntimeOriginFromRequest } from "@/lib/site";
import { createSubmission, getAdminProfile, updateUserRejectedSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const isAdmin = await isAdminAuthenticated();
  if (!user && !isAdmin) {
    return NextResponse.json({ ok: false, error: "请先登录后再发布技能。" }, { status: 401 });
  }

  const formData = await request.formData();

  try {
    const archive = formData.get("archive");

    if (!(archive instanceof File)) {
      throw new Error("请上传 ZIP 压缩包。");
    }

    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const adminProfile = isAdmin ? await getAdminProfile() : null;
    const useAdminActor = isAdmin && !submissionId;
    const authorName = useAdminActor
      ? adminProfile?.displayName || "超级管理员"
      : user?.displayName || user?.username || "超级管理员";
    const authorEmail = useAdminActor
      ? adminProfile?.email || "superadmin@apexhub.local"
      : user?.email || "superadmin@apexhub.local";
    const input = {
      projectId: String(formData.get("projectId") ?? ""),
      appOrigin: getRuntimeOriginFromRequest(request),
      slug: String(formData.get("slug") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      version: String(formData.get("version") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      changelog: String(formData.get("changelog") ?? ""),
      category: String(formData.get("category") ?? ""),
      tags: String(formData.get("tags") ?? ""),
      authorName,
      authorEmail,
      archive: Buffer.from(await archive.arrayBuffer()),
    };

    if (submissionId && !user) {
      throw new Error("超级管理员请发布新版本；驳回稿修改仅支持原提交人在个人工作台操作。");
    }

    const created = submissionId
      ? await updateUserRejectedSubmission({ ...input, submissionId, user: user! })
      : await createSubmission(input);

    return NextResponse.json({
      ok: true,
      slug: created.slug,
      message: [
        `提交成功：${created.slug} 已进入审批队列。`,
        created.feishuNotification?.message ? `飞书：${created.feishuNotification.message}` : undefined,
      ].filter(Boolean).join("\n"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败，请稍后重试。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
