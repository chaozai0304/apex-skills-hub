import { NextResponse } from "next/server";

import { listPublishedCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const results = (await listPublishedCatalog(query)).slice(0, Number.isFinite(limit) ? limit : 20);

  return NextResponse.json({
    results: results.map((item, index) => ({
      slug: item.slug,
      displayName: item.displayName,
      summary: item.summary,
      version: item.version,
      updatedAt: new Date(item.updatedAt).getTime(),
      score: Math.max(0.5, 1 - index * 0.05),
    })),
  });
}
