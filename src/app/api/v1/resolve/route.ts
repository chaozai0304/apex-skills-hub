import { NextResponse } from "next/server";

import { findVersionByFingerprint, getPublishedSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const hash = url.searchParams.get("hash") ?? "";
  const latest = await getPublishedSubmission(slug);
  const matched = hash ? await findVersionByFingerprint(slug, hash) : null;

  return NextResponse.json({
    match: matched ? { version: matched.version } : null,
    latestVersion: latest ? { version: latest.version } : null,
  });
}
