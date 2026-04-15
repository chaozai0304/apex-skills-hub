import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { setSkillRating } from "@/lib/store";

export const dynamic = "force-dynamic";

type RatingRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RatingRouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const { slug } = await context.params;
  const payload = (await request.json()) as { rating?: number };
  const summary = await setSkillRating(slug, user.id, Number(payload.rating));

  return NextResponse.json({ ok: true, summary });
}
