import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck, Sparkles, Star } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { InstallCommand } from "@/components/install-command";
import { SkillCard } from "@/components/skill-card";
import { StatCard } from "@/components/stat-card";
import { getLeaderboardData, getHubStats, listFeaturedSkills } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, stats, leaderboard] = await Promise.all([
    listFeaturedSkills(3),
    getHubStats(),
    getLeaderboardData(3),
  ]);

  return (
    <AppShell>
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
        <div className="section-card flex h-full flex-col justify-between lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-700">
            <Sparkles className="h-4 w-4" />
            在线发布 · 超级管理员审批 · Registry 安装闭环
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl md:leading-[1.1]">
            打造你自己的 Skills Hub，
            <span className="text-sky-700">让团队技能像产品一样被提交、审核、发布和安装。</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Apex Skills Hub 面向企业内部知识沉淀与技能分发场景，支持在线上传 skill 压缩包、管理员审批发布、公开详情页展示，以及通过
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-sm text-slate-900">
              npx clawhub install
            </code>
            直接从 registry 安装。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/publish"
              className="button-primary h-12 gap-2 px-6 text-sm"
            >
              立即发布技能
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="button-secondary h-12 px-6 text-sm"
            >
              浏览技能库
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { label: "流程闭环", value: "提交 → 审批 → 发布", icon: ShieldCheck },
              { label: "安装方式", value: "Web 下载 / CLI 安装", icon: Sparkles },
              { label: "发现机制", value: "搜索 / 收藏 / 榜单", icon: Flame },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50/90 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                <div className="mt-3 text-base font-semibold text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <InstallCommand
          command="npx clawhub install frontend --registry http://localhost:3000"
          note="首页这里展示的是示例命令，用于说明平台接入方式；实际技能详情页会展示对应技能的真实安装命令。"
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="已发布技能"
          value={formatNumber(stats.publishedSkills)}
          hint="按 slug 聚合后的可用技能总数"
        />
        <StatCard
          label="发布版本"
          value={formatNumber(stats.publishedVersions)}
          hint="含多版本沉淀，可作为知识演进历史"
        />
        <StatCard
          label="待审批"
          value={formatNumber(stats.pendingReviews)}
          hint="超级管理员可在控制台批量处理"
        />
        <StatCard
          label="累计下载"
          value={formatNumber(stats.totalDownloads)}
          hint="详情页下载与 CLI 安装会同步累计"
        />
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Featured Skills
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              推荐技能与规范示例
            </h2>
          </div>
          <Link href="/search" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            查看全部 →
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {featured.map((item) => (
            <SkillCard key={item.slug} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="section-eyebrow">Top Favorites</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">收藏热度榜</h2>
            </div>
            <Flame className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-6 space-y-3">
            {leaderboard.favorites.map((item, index) => (
              <Link key={item.slug} href={`/skills/${item.slug}`} className="flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition hover:bg-white hover:shadow-sm">
                <div>
                  <div className="text-base font-semibold text-slate-950">#{index + 1} {item.displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.slug} · {item.favoriteCount} 收藏</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="section-eyebrow">Top Ratings</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">评分口碑榜</h2>
            </div>
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-6 space-y-3">
            {leaderboard.ratings.map((item, index) => (
              <Link key={`${item.slug}-rating`} href={`/skills/${item.slug}`} className="flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition hover:bg-white hover:shadow-sm">
                <div>
                  <div className="text-base font-semibold text-slate-950">#{index + 1} {item.displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.averageRating.toFixed(1)} / 5 · {item.ratingCount} 条评分</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "1. 作者在线上传",
            description:
              "通过网页表单上传包含 SKILL.md 的 ZIP 压缩包，补充 slug、版本、标签、摘要和作者信息。",
          },
          {
            title: "2. 超级管理员审批",
            description:
              "管理员在控制台核查结构、内容和适用场景，对提交结果进行发布或驳回，并记录审核意见。",
          },
          {
            title: "3. 页面展示与安装",
            description:
              "发布后自动出现在详情页和搜索页，用户既可以网页下载，也可以使用 ClawHub CLI 直连安装。",
          },
        ].map((step) => (
          <div
            key={step.title}
            className="surface-card h-full p-6"
          >
            <div className="text-lg font-semibold text-slate-950">{step.title}</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

