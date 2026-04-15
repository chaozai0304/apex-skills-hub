import { NextResponse } from "next/server";

import { getPublishedSubmission, incrementDownload, readArchive } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const version = url.searchParams.get("version") ?? undefined;
  const submission = await getPublishedSubmission(slug, version);

  if (!submission) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  await incrementDownload(submission.id);
  const archive = await readArchive(submission);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${submission.slug}-${submission.version}.zip"`,
    },
  });
}
