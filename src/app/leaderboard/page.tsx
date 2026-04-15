import Link from "next/link";
import { Flame, Medal, Star } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getLeaderboardData } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboardData(10);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">Leaderboard</div>
        <h1 className="section-title mt-3">收藏 / 评分排行榜</h1>
        <p className="section-description mt-4 max-w-3xl">
          用统一的榜单快速发现当前最受欢迎、评分最高的技能包，既方便团队推广，也方便新人少走弯路。
        </p>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="surface-card p-8">
          <div className="flex items-center gap-3 text-slate-950">
            <Flame className="h-5 w-5 text-rose-500" />
            <h2 className="text-2xl font-semibold tracking-tight">收藏热度榜</h2>
          </div>
          <div className="mt-6 space-y-4">
            {leaderboard.favorites.map((item, index) => (
              <Link
                key={`favorite-${item.slug}`}
                href={`/skills/${item.slug}`}
                className="flex items-start justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50/90 p-5 transition hover:border-sky-200 hover:bg-white"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-900 shadow-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{item.displayName}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.slug} · {item.version} · {item.category}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{item.summary}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div className="font-semibold text-slate-950">{formatNumber(item.favoriteCount)} 收藏</div>
                  <div className="mt-1">{formatNumber(item.downloads)} 下载</div>
                </div>
              </Link>
            ))}

            {!leaderboard.favorites.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                暂时还没有收藏数据，先去挑几个顺眼的技能点个收藏，榜单就会热闹起来。
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface-card p-8">
          <div className="flex items-center gap-3 text-slate-950">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-semibold tracking-tight">评分口碑榜</h2>
          </div>
          <div className="mt-6 space-y-4">
            {leaderboard.ratings.map((item, index) => (
              <Link
                key={`rating-${item.slug}`}
                href={`/skills/${item.slug}`}
                className="flex items-start justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50/90 p-5 transition hover:border-sky-200 hover:bg-white"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-900 shadow-sm">
                    <Medal className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{item.displayName}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.slug} · {item.version} · {item.category}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{item.summary}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div className="font-semibold text-slate-950">{item.averageRating.toFixed(1)} / 5</div>
                  <div className="mt-1">{item.ratingCount} 条评分 · 第 {index + 1} 名</div>
                </div>
              </Link>
            ))}

            {!leaderboard.ratings.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                暂时还没有评分数据，登录后去技能详情页点亮小星星即可上榜。
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
