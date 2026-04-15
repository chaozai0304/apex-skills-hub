import { NextResponse } from "next/server";

import { mapSkillVersion } from "@/lib/registry";
import { getPublishedSubmission } from "@/lib/store";

export const dynamic = "force-dynamic";

type SkillVersionRouteContext = {
  params: Promise<{ slug: string; version: string }>;
};

export async function GET(_request: Request, context: SkillVersionRouteContext) {
  const { slug, version } = await context.params;
  const submission = await getPublishedSubmission(slug, version);

  if (!submission) {
    return NextResponse.json({ version: null, skill: null }, { status: 404 });
  }

  return NextResponse.json(mapSkillVersion(submission));
}
