import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { toggleFavorite } from "@/lib/store";

export const dynamic = "force-dynamic";

type FavoriteRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, context: FavoriteRouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const { slug } = await context.params;
  const summary = await toggleFavorite(slug, user.id);
  return NextResponse.json({ ok: true, summary });
}
