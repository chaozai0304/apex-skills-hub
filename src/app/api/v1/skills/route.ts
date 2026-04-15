import { NextResponse } from "next/server";

import { sortCatalog } from "@/lib/registry";
import { getSkillDetail, listPublishedCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");
  const sort = url.searchParams.get("sort");
  const catalog = sortCatalog(await listPublishedCatalog(), sort).slice(0, Number.isFinite(limit) ? limit : 25);
  const items = await Promise.all(
    catalog.map(async (item) => {
      const detail = await getSkillDetail(item.slug);
      return detail?.latest;
    }),
  );

  return NextResponse.json({
    items: items.filter(Boolean).map((entry) => ({
      slug: entry!.slug,
      displayName: entry!.displayName,
      summary: entry!.summary,
      tags: entry!.tags,
      stats: {
        downloads: entry!.downloads,
        installsCurrent: entry!.installsCurrent,
        installsAllTime: entry!.installsAllTime,
        stars: entry!.stars,
      },
      createdAt: new Date(entry!.createdAt).getTime(),
      updatedAt: new Date(entry!.updatedAt).getTime(),
      latestVersion: {
        version: entry!.version,
        createdAt: new Date(entry!.publishedAt ?? entry!.createdAt).getTime(),
        changelog: entry!.changelog,
        license: null,
      },
    })),
    nextCursor: null,
  });
}
