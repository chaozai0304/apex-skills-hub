import { AppShell } from "@/components/app-shell";
import { SkillCard } from "@/components/skill-card";
import { listPublishedCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q?.trim() ?? "";
  const results = await listPublishedCatalog(query);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">
          Search
        </div>
        <h1 className="section-title mt-3">技能广场</h1>
        <p className="section-description mt-4 max-w-3xl">
          支持按照技能名称、slug、摘要和标签搜索已发布的技能，并快速进入详情页安装或下载。
        </p>

        <form className="mt-8 flex flex-col gap-3 md:flex-row" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="搜索需求、故障演练、workflow..."
            className="field-input h-14 flex-1 placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="button-primary h-14 px-6 text-sm"
          >
            搜索技能
          </button>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            共找到 <span className="font-semibold text-slate-950">{results.length}</span> 个结果
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {results.map((item) => (
            <SkillCard key={item.slug} item={item} />
          ))}
        </div>

        {!results.length ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
            暂未匹配到相关技能，试试更短的关键词，或者前往发布页创建你的第一个 skill。
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
