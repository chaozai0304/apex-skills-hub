import Link from "next/link";
import { Flame, Medal, Star } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLeaderboardData } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const locale = await getCurrentLocale();
  const leaderboard = await getLeaderboardData(10);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">Leaderboard</div>
        <h1 className="section-title mt-3">{pick(locale, "收藏 / 评分排行榜", "Favorites / Ratings Leaderboard")}</h1>
        <p className="section-description mt-4 max-w-3xl">
          {pick(locale, "用统一的榜单快速发现当前最受欢迎、评分最高的技能包，既方便团队推广，也方便新人少走弯路。", "Use unified rankings to discover the most popular and highest-rated skills, helping teams promote quality assets and new members ramp up faster.")}
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center gap-3 text-slate-950">
            <Flame className="h-5 w-5 text-rose-500" />
            <h2 className="text-xl font-semibold tracking-tight">{pick(locale, "收藏热度榜", "Most Favorited")}</h2>
          </div>
          <div className="mt-4 space-y-3">
            {leaderboard.favorites.map((item, index) => (
              <Link
                key={`favorite-${item.slug}`}
                href={`/skills/${item.slug}`}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 transition hover:border-sky-200 hover:bg-white"
              >
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900 shadow-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.slug} · {item.version} · {item.category}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-950">{pick(locale, `${formatNumber(item.favoriteCount, locale)} 收藏`, `${formatNumber(item.favoriteCount, locale)} favorites`)}</div>
                  <div className="mt-1">{pick(locale, `${formatNumber(item.downloads, locale)} 下载`, `${formatNumber(item.downloads, locale)} downloads`)}</div>
                </div>
              </Link>
            ))}

            {!leaderboard.favorites.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                {pick(locale, "暂时还没有收藏数据，先去挑几个顺眼的技能点个收藏，榜单就会热闹起来。", "There is no favorites data yet. Start by adding a few skills to favorites and the leaderboard will come alive.")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-3 text-slate-950">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold tracking-tight">{pick(locale, "评分口碑榜", "Top Rated")}</h2>
          </div>
          <div className="mt-4 space-y-3">
            {leaderboard.ratings.map((item, index) => (
              <Link
                key={`rating-${item.slug}`}
                href={`/skills/${item.slug}`}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 transition hover:border-sky-200 hover:bg-white"
              >
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900 shadow-sm">
                    <Medal className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.slug} · {item.version} · {item.category}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-950">{item.averageRating.toFixed(1)} / 5</div>
                  <div className="mt-1">{pick(locale, `${item.ratingCount} 条评分 · 第 ${index + 1} 名`, `${item.ratingCount} rating(s) · Rank #${index + 1}`)}</div>
                </div>
              </Link>
            ))}

            {!leaderboard.ratings.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                {pick(locale, "暂时还没有评分数据，登录后去技能详情页点亮小星星即可上榜。", "There is no rating data yet. Sign in and rate skills on the detail page to start populating the board.")}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
