import { NextResponse } from "next/server";

import { createSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const archive = formData.get("archive");

    if (!(archive instanceof File)) {
      throw new Error("请上传 ZIP 压缩包。");
    }

    const created = await createSubmission({
      slug: String(formData.get("slug") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      version: String(formData.get("version") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      changelog: String(formData.get("changelog") ?? ""),
      category: String(formData.get("category") ?? ""),
      tags: String(formData.get("tags") ?? ""),
      authorName: String(formData.get("authorName") ?? ""),
      authorEmail: String(formData.get("authorEmail") ?? ""),
      archive: Buffer.from(await archive.arrayBuffer()),
    });

    return NextResponse.json({
      ok: true,
      slug: created.slug,
      message: `提交成功：${created.slug} 已进入审批队列。`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败，请稍后重试。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
