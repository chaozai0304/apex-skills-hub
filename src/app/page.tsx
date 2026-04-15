import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck, Sparkles, Star } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { InstallCommand } from "@/components/install-command";
import { SkillCard } from "@/components/skill-card";
import { StatCard } from "@/components/stat-card";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLeaderboardData, getHubStats, listFeaturedSkills } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getCurrentLocale();
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
            {pick(locale, "在线发布 · 超级管理员审批 · Registry 安装闭环", "Online publishing · admin review · registry-ready installation")}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl md:leading-[1.1]">
            {pick(locale, "打造你自己的 Skills Hub，", "Build your own Skills Hub,")}
            <span className="text-sky-700">{pick(locale, "让团队技能像产品一样被提交、审核、发布和安装。", "so team skills can be submitted, reviewed, published, and installed like products.")}</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            {pick(locale, "Apex Skills Hub 面向企业内部知识沉淀与技能分发场景，支持在线上传 skill 压缩包、管理员审批发布、公开详情页展示，以及通过", "Apex Skills Hub is designed for internal knowledge distribution and reusable skill delivery. It supports web-based ZIP uploads, admin review workflows, public detail pages, and direct installation through")}
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-sm text-slate-900">
              npx clawhub install
            </code>
            {pick(locale, "直接从 registry 安装。", "from the registry.")}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/publish"
              className="button-primary h-12 gap-2 px-6 text-sm"
            >
              {pick(locale, "立即发布技能", "Publish a skill")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="button-secondary h-12 px-6 text-sm"
            >
              {pick(locale, "浏览技能库", "Browse skills")}
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { label: pick(locale, "流程闭环", "Workflow"), value: pick(locale, "提交 → 审批 → 发布", "Submit → Review → Publish"), icon: ShieldCheck },
              { label: pick(locale, "安装方式", "Delivery"), value: pick(locale, "Web 下载 / CLI 安装", "Web download / CLI install"), icon: Sparkles },
              { label: pick(locale, "发现机制", "Discovery"), value: pick(locale, "搜索 / 收藏 / 榜单", "Search / Favorites / Rankings"), icon: Flame },
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
          note={pick(locale, "首页这里展示的是示例命令，用于说明平台接入方式；实际技能详情页会展示对应技能的真实安装命令。", "This command is an example shown on the homepage to explain the integration model. The real skill detail page will display the exact install command for each skill.")}
          locale={locale}
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={pick(locale, "已发布技能", "Published skills")}
          value={formatNumber(stats.publishedSkills, locale)}
          hint={pick(locale, "按 slug 聚合后的可用技能总数", "Available skills aggregated by slug")}
        />
        <StatCard
          label={pick(locale, "发布版本", "Published versions")}
          value={formatNumber(stats.publishedVersions, locale)}
          hint={pick(locale, "含多版本沉淀，可作为知识演进历史", "Version history that captures knowledge evolution")}
        />
        <StatCard
          label={pick(locale, "待审批", "Pending review")}
          value={formatNumber(stats.pendingReviews, locale)}
          hint={pick(locale, "超级管理员可在控制台批量处理", "Batch-manageable by the super admin console")}
        />
        <StatCard
          label={pick(locale, "累计下载", "Total downloads")}
          value={formatNumber(stats.totalDownloads, locale)}
          hint={pick(locale, "详情页下载与 CLI 安装会同步累计", "Includes both web downloads and CLI installs")}
        />
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Featured Skills
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {pick(locale, "推荐技能与规范示例", "Featured skills and reference examples")}
            </h2>
          </div>
          <Link href="/search" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            {pick(locale, "查看全部 →", "View all →")}
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {featured.map((item) => (
            <SkillCard key={item.slug} item={item} locale={locale} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="section-eyebrow">Top Favorites</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{pick(locale, "收藏热度榜", "Most Favorited")}</h2>
            </div>
            <Flame className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-6 space-y-3">
            {leaderboard.favorites.map((item, index) => (
              <Link key={item.slug} href={`/skills/${item.slug}`} className="flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition hover:bg-white hover:shadow-sm">
                <div>
                  <div className="text-base font-semibold text-slate-950">#{index + 1} {item.displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.slug} · {pick(locale, `${item.favoriteCount} 收藏`, `${item.favoriteCount} favorites`)}</div>
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
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{pick(locale, "评分口碑榜", "Top Rated")}</h2>
            </div>
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-6 space-y-3">
            {leaderboard.ratings.map((item, index) => (
              <Link key={`${item.slug}-rating`} href={`/skills/${item.slug}`} className="flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4 transition hover:bg-white hover:shadow-sm">
                <div>
                  <div className="text-base font-semibold text-slate-950">#{index + 1} {item.displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.averageRating.toFixed(1)} / 5 · {pick(locale, `${item.ratingCount} 条评分`, `${item.ratingCount} rating(s)`)}</div>
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
            title: pick(locale, "1. 作者在线上传", "1. Authors publish online"),
            description:
              pick(locale, "通过网页表单上传包含 SKILL.md 的 ZIP 压缩包，补充 slug、版本、标签、摘要和作者信息。", "Upload a ZIP package containing SKILL.md through a web form and provide slug, version, tags, summary, and author information."),
          },
          {
            title: pick(locale, "2. 超级管理员审批", "2. Super admin review"),
            description:
              pick(locale, "管理员在控制台核查结构、内容和适用场景，对提交结果进行发布或驳回，并记录审核意见。", "Admins verify structure, content, and usage scenarios in the console, then publish or reject submissions with review notes."),
          },
          {
            title: pick(locale, "3. 页面展示与安装", "3. Discover and install"),
            description:
              pick(locale, "发布后自动出现在详情页和搜索页，用户既可以网页下载，也可以使用 ClawHub CLI 直连安装。", "Published skills automatically appear on detail and search pages, and can be downloaded on the web or installed directly with the ClawHub CLI."),
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

