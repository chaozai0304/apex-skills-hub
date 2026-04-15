import { NextResponse } from "next/server";

import { getSkillDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

type SkillVersionsRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: SkillVersionsRouteContext) {
  const { slug } = await context.params;
  const detail = await getSkillDetail(slug);

  if (!detail) {
    return NextResponse.json({ items: [], nextCursor: null }, { status: 404 });
  }

  return NextResponse.json({
    items: detail.versions.map((entry) => ({
      version: entry.version,
      createdAt: new Date(entry.publishedAt ?? entry.createdAt).getTime(),
      changelog: entry.changelog,
      changelogSource: "user",
    })),
    nextCursor: null,
  });
}
