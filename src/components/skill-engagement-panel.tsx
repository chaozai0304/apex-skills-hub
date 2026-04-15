"use client";

import Link from "next/link";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import type { SkillEngagementSummary } from "@/lib/types";

type SkillEngagementPanelProps = {
  slug: string;
  initialSummary: SkillEngagementSummary;
  isLoggedIn: boolean;
  layout?: "full" | "compact";
  locale?: Locale;
};

export function SkillEngagementPanel({
  slug,
  initialSummary,
  isLoggedIn,
  layout = "full",
  locale = "zh",
}: SkillEngagementPanelProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [busy, setBusy] = useState<"favorite" | "rating" | null>(null);
  const loginHref = `/login?next=${encodeURIComponent(`/skills/${slug}`)}`;
  const compact = layout === "compact";

  async function handleFavorite() {
    if (!isLoggedIn) {
      return;
    }

    setBusy("favorite");
    try {
      const response = await fetch(`/api/skills/${slug}/favorite`, { method: "POST" });
      const data = (await response.json()) as { ok: boolean; summary?: SkillEngagementSummary };
      if (response.ok && data.summary) {
        setSummary(data.summary);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleRate(rating: number) {
    if (!isLoggedIn) {
      return;
    }

    setBusy("rating");
    try {
      const response = await fetch(`/api/skills/${slug}/rating`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const data = (await response.json()) as { ok: boolean; summary?: SkillEngagementSummary };
      if (response.ok && data.summary) {
        setSummary(data.summary);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`surface-card ${compact ? "p-5" : "p-6"}`}>
      <div className="section-eyebrow">{pick(locale, "收藏与评分", "Favorites & Ratings")}</div>
      <h3 className={`mt-3 font-semibold tracking-tight text-slate-950 ${compact ? "text-xl" : "text-2xl"}`}>
        {pick(locale, "社区互动", "Community")}
      </h3>

      <div className={`mt-6 grid gap-4 ${compact ? "sm:grid-cols-2 xl:grid-cols-1" : "md:grid-cols-3"}`}>
        <div className="rounded-3xl bg-slate-50 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{pick(locale, "平均评分", "Average Rating")}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.averageRating || 0}</div>
          <div className="mt-1 text-sm text-slate-500">{pick(locale, `共 ${summary.ratingCount} 次评分`, `${summary.ratingCount} rating(s)`)}</div>
        </div>
        <div className="rounded-3xl bg-slate-50 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{pick(locale, "收藏人数", "Favorites")}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.favoriteCount}</div>
          <div className="mt-1 text-sm text-slate-500">{pick(locale, "当前技能被加入收藏的次数", "How many times this skill has been added to favorites")}</div>
        </div>
        <div className="rounded-3xl bg-slate-50 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{pick(locale, "我的评分", "My Rating")}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.currentUserRating ?? "-"}</div>
          <div className="mt-1 text-sm text-slate-500">{pick(locale, "登录后可更新你的评价", "Sign in to update your rating")}</div>
        </div>
      </div>

      {isLoggedIn ? (
        <div className={`mt-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 ${compact ? "" : "md:flex-row md:items-center md:justify-between"}`}>
          <div>
            <div className="text-sm font-medium text-slate-700">{pick(locale, "给这个技能打分", "Rate this skill")}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((rating) => {
                const active = (summary.currentUserRating ?? 0) >= rating;
                return (
                  <button
                    key={rating}
                    type="button"
                    disabled={busy === "rating"}
                    onClick={() => handleRate(rating)}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                      active
                        ? "border-amber-300 bg-amber-100 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                    }`}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={busy === "favorite"}
            onClick={handleFavorite}
            className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition ${compact ? "w-full" : ""} ${
              summary.isFavorited
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                : "bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            {summary.isFavorited ? pick(locale, "已收藏，点击取消", "Favorited · click to remove") : pick(locale, "加入收藏", "Add to favorites")}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          {pick(locale, "登录后即可收藏技能并给出评分。", "Sign in to favorite this skill and leave a rating.")}
          <Link href={loginHref} className={`font-semibold text-sky-700 hover:text-sky-800 ${compact ? "mt-2 inline-flex" : "ml-2"}`}>
            {pick(locale, "去登录 →", "Go to sign in →")}
          </Link>
        </div>
      )}
    </div>
  );
}
