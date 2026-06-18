import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { SkillCard } from "@/components/skill-card";
import { pick, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { listProjectOptions, listPublishedCatalog } from "@/lib/store";
import type { CatalogItem } from "@/lib/types";
import { formatNumber, formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 8;

type ViewMode = "cards" | "table";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; project?: string; page?: string; view?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const [locale, projects] = await Promise.all([getCurrentLocale(), listProjectOptions()]);
  const query = resolvedSearchParams.q?.trim() ?? "";
  const selectedProject = projects.some((project) => project.id === resolvedSearchParams.project)
    ? resolvedSearchParams.project ?? ""
    : "";
  const view = normalizeViewMode(resolvedSearchParams.view);
  const page = normalizePage(resolvedSearchParams.page);
  const results = await listPublishedCatalog(query, selectedProject);
  const paginatedResults = paginate(results, page, PAGE_SIZE);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">
          Search
        </div>
        <h1 className="section-title mt-3">{pick(locale, "技能广场", "Skill Directory")}</h1>
        <p className="section-description mt-4 max-w-3xl">
          {pick(locale, "支持按照技能名称、slug、摘要和标签搜索已发布的技能，并快速进入详情页安装或下载。", "Search published skills by title, slug, summary, and tags, then jump directly to the detail page for installation or download.")}
        </p>

        <form className="mt-5 flex flex-col gap-2 md:flex-row" method="get">
          <input type="hidden" name="view" value={view} />
          <select name="project" defaultValue={selectedProject} className="field-input h-10 md:w-56">
            <option value="">全部项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={pick(locale, "搜索需求、故障演练、workflow...", "Search requirements, incident drills, workflow...")}
            className="field-input h-10 flex-1 placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="button-primary h-10 px-5 text-xs"
          >
            {pick(locale, "搜索技能", "Search skills")}
          </button>
        </form>
      </section>

      <section className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            {pick(locale, "共找到 ", "Found ")}<span className="font-semibold text-slate-950">{results.length}</span>{pick(locale, " 个结果", " result(s)")}
            {results.length ? (
              <span className="ml-2 text-xs text-slate-400">
                {pick(locale, `第 ${paginatedResults.page} / ${paginatedResults.totalPages} 页`, `Page ${paginatedResults.page} / ${paginatedResults.totalPages}`)}
              </span>
            ) : null}
          </div>
          <div className="inline-flex w-fit rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
            {([
              { key: "cards" as const, label: pick(locale, "卡片", "Cards") },
              { key: "table" as const, label: pick(locale, "表格", "Table") },
            ]).map((item) => (
              <Link
                key={item.key}
                href={buildSearchHref({ query, project: selectedProject, view: item.key, page: 1 })}
                className={`inline-flex h-8 items-center rounded-xl px-3 transition ${view === item.key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {view === "cards" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {paginatedResults.items.map((item) => (
              <SkillCard key={item.slug} item={item} locale={locale} />
            ))}
          </div>
        ) : (
          <SkillTable items={paginatedResults.items} locale={locale} />
        )}

        {!results.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
            {pick(locale, "暂未匹配到相关技能，试试更短的关键词，或者前往发布页创建你的第一个 skill。", "No matching skills found yet. Try a shorter keyword, or head to the publish page to create your first skill.")}
          </div>
        ) : null}

        {results.length ? (
          <Pagination
            page={paginatedResults.page}
            totalPages={paginatedResults.totalPages}
            query={query}
            project={selectedProject}
            view={view}
          />
        ) : null}
      </section>
    </AppShell>
  );
}

function SkillTable({ items, locale }: { items: CatalogItem[]; locale: Locale }) {
  return (
    <div className="compact-table mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white/90">
      <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3">技能</th>
            <th className="px-4 py-3">项目</th>
            <th className="px-4 py-3">分类 / 标签</th>
            <th className="px-4 py-3">版本</th>
            <th className="px-4 py-3">下载</th>
            <th className="px-4 py-3">文件</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.slug} className="align-middle hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-950">{item.displayName}</div>
                <div className="mt-1 text-[11px] text-slate-500">{item.slug}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{item.summary}</p>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {item.projectName}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                  {item.category}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{tag}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-900">{item.version}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{formatNumber(item.downloads, locale)}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{item.fileCount}</td>
              <td className="px-4 py-3">
                <div className="grid gap-1.5">
                  <Link href={`/skills/${item.slug}`} className="button-primary h-8 px-3 text-[11px]">
                    {pick(locale, "查看详情", "Details")}
                  </Link>
                  <span className="text-[11px] text-slate-400">{formatRelativeDate(item.updatedAt, locale)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  query,
  project,
  view,
}: {
  page: number;
  totalPages: number;
  query: string;
  project: string;
  view: ViewMode;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-white/70 px-3 py-2">
      <Link
        href={buildSearchHref({ query, project, view, page: Math.max(1, page - 1) })}
        className={`button-secondary h-9 px-3 text-xs ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        上一页
      </Link>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <Link
          key={pageNumber}
          href={buildSearchHref({ query, project, view, page: pageNumber })}
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-xs font-semibold leading-none shadow-sm transition ${pageNumber === page ? "bg-slate-950 !text-white ring-1 ring-slate-950" : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"}`}
          aria-current={pageNumber === page ? "page" : undefined}
        >
          {pageNumber}
        </Link>
      ))}
      <Link
        href={buildSearchHref({ query, project, view, page: Math.min(totalPages, page + 1) })}
        className={`button-secondary h-9 px-3 text-xs ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
      >
        下一页
      </Link>
    </div>
  );
}

function normalizeViewMode(value?: string): ViewMode {
  return value === "table" ? "table" : "cards";
}

function normalizePage(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}

function buildSearchHref(input: { query: string; project: string; view: ViewMode; page: number }) {
  const params = new URLSearchParams({ page: String(input.page), view: input.view });
  if (input.project.trim()) {
    params.set("project", input.project.trim());
  }
  if (input.query.trim()) {
    params.set("q", input.query.trim());
  }
  return `/search?${params.toString()}`;
}
