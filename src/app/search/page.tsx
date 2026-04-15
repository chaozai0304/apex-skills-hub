import { AppShell } from "@/components/app-shell";
import { SkillCard } from "@/components/skill-card";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { listPublishedCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = await getCurrentLocale();
  const query = resolvedSearchParams.q?.trim() ?? "";
  const results = await listPublishedCatalog(query);

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

        <form className="mt-8 flex flex-col gap-3 md:flex-row" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={pick(locale, "搜索需求、故障演练、workflow...", "Search requirements, incident drills, workflow...")}
            className="field-input h-14 flex-1 placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="button-primary h-14 px-6 text-sm"
          >
            {pick(locale, "搜索技能", "Search skills")}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {pick(locale, "共找到 ", "Found ")}<span className="font-semibold text-slate-950">{results.length}</span>{pick(locale, " 个结果", " result(s)")}
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {results.map((item) => (
            <SkillCard key={item.slug} item={item} locale={locale} />
          ))}
        </div>

        {!results.length ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
            {pick(locale, "暂未匹配到相关技能，试试更短的关键词，或者前往发布页创建你的第一个 skill。", "No matching skills found yet. Try a shorter keyword, or head to the publish page to create your first skill.")}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
