import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, Download, Files, Layers3, PencilLine, Star, Tag } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { FileTree } from "@/components/file-tree";
import { InstallCommand } from "@/components/install-command";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SkillEngagementPanel } from "@/components/skill-engagement-panel";
import { getCurrentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getOriginFromHeaders, buildInstallCommand } from "@/lib/site";
import { getSkillDetail, getSkillEngagementSummary } from "@/lib/store";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SkillPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function SkillDetailPage({ params, searchParams }: SkillPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = await getCurrentLocale();
  const detail = await getSkillDetail(slug);

  if (!detail) {
    notFound();
  }

  const user = await getCurrentUser();
  const registry = getOriginFromHeaders(await headers());
  const installCommand = buildInstallCommand(detail.latest.slug, registry);
  const engagement = await getSkillEngagementSummary(detail.latest.slug, user?.id);
  const activeTab = isSkillTabKey(resolvedSearchParams.tab) ? resolvedSearchParams.tab : "overview";
  const updateQuery = new URLSearchParams({
    mode: "update",
    slug: detail.latest.slug,
    displayName: detail.latest.displayName,
    category: detail.latest.category,
    summary: detail.latest.summary,
    tags: detail.latest.tags.join(", "),
    authorName: detail.latest.authorName,
    authorEmail: detail.latest.authorEmail,
    changelog: detail.latest.changelog,
    latestVersion: detail.latest.version,
  }).toString();
  const updateHref = `/publish?${updateQuery}`;
  const tabs = [
    { key: "overview", label: pick(locale, "概览", "Overview") },
    { key: "files", label: pick(locale, "文件", "Files") },
    { key: "versions", label: pick(locale, "版本", "Versions") },
  ];
  const activeTabMeta =
    activeTab === "overview"
      ? {
          eyebrow: "SKILL.md",
          title: pick(locale, "概览", "Overview"),
          description: pick(locale, "浏览技能说明文档、核心能力介绍以及使用背景，让阅读体验更接近正式产品文档页面。", "Browse the skill documentation, core capabilities, and usage context in a more product-like reading experience."),
        }
      : activeTab === "files"
        ? {
            eyebrow: pick(locale, "文件浏览", "File browser"),
            title: pick(locale, "文件目录", "File tree"),
            description: pick(locale, `查看 ${detail.latest.version} 版本压缩包中的目录结构，在下载前快速了解这个技能包含哪些脚本、文档和资源。`, `Inspect the directory structure of version ${detail.latest.version} before downloading to understand which scripts, docs, and assets are included.`),
          }
        : {
            eyebrow: pick(locale, "版本记录", "Version history"),
            title: pick(locale, "历史版本", "Release history"),
            description: pick(locale, "按发布时间查看历次发布版本、更新说明与下载入口，未指定版本时 CLI 默认安装最新发布版本。", "Review published versions by release time, inspect changelogs, and download older artifacts. The CLI resolves to the latest published version by default."),
          };

  return (
    <AppShell>
      <section className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
        <div className="section-card lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              global
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Layers3 className="h-3.5 w-3.5" />
              {pick(locale, "已发布", "Published")}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
            {detail.latest.displayName}
          </h1>
          <div className="mt-4 text-sm text-slate-500">
            {pick(locale, `作者 ${detail.latest.authorName} · 最新版本 ${detail.latest.version}`, `By ${detail.latest.authorName} · Latest version ${detail.latest.version}`)}
          </div>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-600">{detail.latest.summary}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { label: pick(locale, "版本", "Version"), value: detail.latest.version, icon: Layers3 },
              { label: pick(locale, "下载量", "Downloads"), value: formatNumber(detail.latest.downloads, locale), icon: Download },
              { label: pick(locale, "文件数", "Files"), value: String(detail.latest.fileCount), icon: Files },
              { label: pick(locale, "收藏 / 评分", "Favorites / Rating"), value: `${engagement.favoriteCount} / ${engagement.averageRating.toFixed(1)}`, icon: Star },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`/api/download/${detail.latest.id}`} className="button-primary h-12 px-6 text-sm">
              {pick(locale, "下载 ZIP", "Download ZIP")}
            </a>
            <Link href={updateHref} className="button-secondary h-12 gap-2 px-6 text-sm">
              <PencilLine className="h-4 w-4" />
              {pick(locale, "提交新版本", "Submit new version")}
            </Link>
            <Link href="/search" className="button-secondary h-12 px-6 text-sm">
              {pick(locale, "返回搜索", "Back to search")}
            </Link>
          </div>
        </div>

        <section className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-eyebrow">{activeTabMeta.eyebrow}</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{activeTabMeta.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{activeTabMeta.description}</p>
              </div>

              <div className="inline-flex w-fit flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5">
                {tabs.map((tab) => (
                  <Link
                    key={tab.key}
                    href={`/skills/${detail.latest.slug}?tab=${tab.key}`}
                    className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 lg:px-8 lg:py-8">
            {activeTab === "overview" ? (
              <div className="rounded-[2rem] bg-slate-50 px-6 py-6 text-sm text-slate-700 lg:px-8 lg:py-8">
                <MarkdownRenderer content={detail.latest.readme} />
              </div>
            ) : null}

            {activeTab === "files" ? (
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Files className="h-5 w-5 text-slate-500" />
                    <div className="text-lg font-semibold text-slate-950">{pick(locale, "文件浏览", "File browser")}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                    {detail.latest.fileCount}
                  </div>
                </div>
                <div className="px-4 py-4 lg:px-5 lg:py-5">
                  <FileTree nodes={detail.latest.fileTree} />
                </div>
              </div>
            ) : null}

            {activeTab === "versions" ? (
              <div className="space-y-4">
                {detail.versions.map((version, index) => (
                  <div key={version.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_-32px_rgba(15,23,42,0.35)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-950">
                          {version.version}
                          {index === 0 ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              {pick(locale, "最新", "Latest")}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="h-4 w-4" />
                            {formatDateTime(version.publishedAt ?? version.updatedAt, locale)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Download className="h-4 w-4" />
                            {pick(locale, "下载量 ", "Downloads ")}{formatNumber(version.downloads, locale)}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-600">{version.changelog || pick(locale, "暂无更新说明", "No changelog provided")}</p>
                      </div>

                      <a
                        href={`/api/download/${version.id}`}
                        className="button-secondary h-11 shrink-0 px-5 text-sm"
                      >
                        {pick(locale, "下载该版本", "Download this version")}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="section-eyebrow">技能信息</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{pick(locale, "侧边摘要", "Sidebar summary")}</h2>
            </div>

            <dl className="divide-y divide-slate-100">
              {[
                { label: pick(locale, "最新版本", "Latest version"), value: detail.latest.version },
                { label: pick(locale, "文件数量", "File count"), value: String(detail.latest.fileCount) },
                { label: pick(locale, "下载总量", "Total downloads"), value: formatNumber(detail.latest.downloads, locale) },
                { label: pick(locale, "发布时间", "Published at"), value: formatDateTime(detail.latest.publishedAt ?? detail.latest.updatedAt, locale) },
                { label: pick(locale, "作者", "Author"), value: detail.latest.authorName },
                { label: pick(locale, "分类", "Category"), value: detail.latest.category },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4 px-6 py-4">
                  <dt className="text-sm text-slate-500">{item.label}</dt>
                  <dd className="text-right text-sm font-semibold text-slate-950">{item.value}</dd>
                </div>
              ))}
            </dl>

            {detail.latest.tags.length ? (
              <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Tag className="h-3.5 w-3.5" />
                  {pick(locale, "标签", "Tags")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.latest.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <InstallCommand
            command={installCommand}
            note={pick(locale, "如果你提交的是同 slug 的新版本，只要管理员审批通过，未显式指定版本时 clawhub CLI 会默认解析并安装该技能的最新发布版本。", "If you submit a new version under the same slug, the clawhub CLI will resolve to the latest published version by default once it is approved.")}
            variant="light"
            locale={locale}
          />

          <SkillEngagementPanel
            slug={detail.latest.slug}
            initialSummary={engagement}
            isLoggedIn={Boolean(user)}
            layout="compact"
            locale={locale}
          />

          <div className="surface-card p-6">
            <div className="section-eyebrow">{pick(locale, "更新技能", "Update skill")}</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{pick(locale, "如何更新这个技能", "How to update this skill")}</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-600">
              <li>{pick(locale, "保持当前技能的 ", "Keep the current ")}<code>slug</code>{pick(locale, " 不变，例如 ", " unchanged, for example ")}<code>{detail.latest.slug}</code>。</li>
              <li>{pick(locale, "准备一个新的压缩包，并把 ", "Prepare a new archive and bump the ")}<code>version</code>{pick(locale, " 提升到比 ", " above ")}<code>{detail.latest.version}</code>{pick(locale, " 更高的新版本。", ".")}</li>
              <li>{pick(locale, "点击“提交新版本”进入更新表单，管理员审批通过后，详情页和 CLI 默认都将指向最新版本。", "Click “Submit new version” to open the update form. After approval, the detail page and CLI will point to the newest published version by default.")}</li>
            </ol>
            <Link href={updateHref} className="button-primary mt-5 h-11 gap-2 px-5 text-sm">
              <PencilLine className="h-4 w-4" />
              {pick(locale, "去提交这个技能的新版本", "Submit a new version for this skill")}
            </Link>
          </div>
          <div className="surface-card p-6">
          <div className="section-eyebrow">{pick(locale, "版本摘要", "Version summary")}</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{pick(locale, "版本时间线", "Version timeline")}</h2>
          <div className="mt-6 space-y-5">
            {detail.versions.map((version, index) => (
              <div key={version.id} className="relative pl-6">
                {index !== detail.versions.length - 1 ? (
                  <div className="absolute left-[0.45rem] top-6 h-[calc(100%+1.1rem)] w-px bg-slate-200" />
                ) : null}
                <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-sky-600 shadow-sm" />
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950">
                      {version.version}
                      {index === 0 ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          {pick(locale, "最新", "Latest")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{version.changelog || pick(locale, "暂无更新说明", "No changelog provided")}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-right text-xs font-medium leading-5 text-slate-500 shadow-sm ring-1 ring-slate-100 whitespace-nowrap">
                      {formatDateTime(version.publishedAt ?? version.updatedAt, locale)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </aside>
      </section>
    </AppShell>
  );
}

type SkillTabKey = "overview" | "files" | "versions";

function isSkillTabKey(value?: string): value is SkillTabKey {
  return value === "overview" || value === "files" || value === "versions";
}
