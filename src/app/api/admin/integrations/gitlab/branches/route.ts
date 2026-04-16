import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { getGitLabBranches } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ message: "未登录或无权限。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      repositoryTreeUrl?: string;
      token?: string;
    };

    const branches = await getGitLabBranches({
      repositoryTreeUrl: String(body.repositoryTreeUrl ?? ""),
      token: String(body.token ?? ""),
    });

    return NextResponse.json({ branches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载 GitLab 分支失败。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
