import { NextResponse } from "next/server";

import { getSubmissionById, incrementDownload, readArchive } from "@/lib/store";

export const dynamic = "force-dynamic";

type DownloadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: DownloadRouteContext) {
  const { id } = await context.params;
  const submission = await getSubmissionById(id);

  if (!submission || submission.status !== "published") {
    return NextResponse.json({ error: "未找到可下载的技能包。" }, { status: 404 });
  }

  await incrementDownload(id);
  const archive = await readArchive(submission);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${submission.slug}-${submission.version}.zip"`,
    },
  });
}
