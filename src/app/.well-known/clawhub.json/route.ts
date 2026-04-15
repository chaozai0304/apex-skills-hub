import { NextResponse } from "next/server";

import { getOriginFromHeaders } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = getOriginFromHeaders(new Headers(request.headers));

  return NextResponse.json({
    apiBase: origin,
    authBase: `${origin}/admin/login`,
    minCliVersion: "0.9.0",
  });
}
