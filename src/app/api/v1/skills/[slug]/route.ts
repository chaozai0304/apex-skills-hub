import { NextResponse } from "next/server";

import { mapSkillDetail } from "@/lib/registry";
import { getSkillDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

type SkillRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: SkillRouteContext) {
  const { slug } = await context.params;
  const detail = await getSkillDetail(slug);

  if (!detail) {
    return NextResponse.json({ skill: null, latestVersion: null, owner: null, moderation: null }, { status: 404 });
  }

  return NextResponse.json(mapSkillDetail(detail.latest));
}
