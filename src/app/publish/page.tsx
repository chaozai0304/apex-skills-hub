import { AppShell } from "@/components/app-shell";
import { PublishForm } from "@/components/publish-form";

export const dynamic = "force-dynamic";

type PublishPageProps = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    slug?: string;
    displayName?: string;
    category?: string;
    summary?: string;
    tags?: string;
    authorName?: string;
    authorEmail?: string;
    changelog?: string;
    latestVersion?: string;
    mode?: string;
  }>;
};

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const resolvedSearchParams = await searchParams;
  const isUpdateMode = resolvedSearchParams.mode === "update";

  return (
    <AppShell>
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.35)]">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Publish Skill
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {isUpdateMode ? "提交技能新版本" : "在线上传你的 Skill"}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {isUpdateMode
              ? "保持原有 slug、不重复使用旧版本号，提交新的 ZIP 包后将进入待审批队列。审批通过后，详情页和 registry API 都会自动以最新发布版本为默认结果。"
              : "上传 ZIP 包后将进入待审批队列。管理员审核通过后，技能会自动进入搜索页、详情页与 registry API。"}
          </p>

          <div className="mt-8 rounded-3xl bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            <div className="font-semibold text-slate-900">{isUpdateMode ? "版本更新说明" : "提交要求"}</div>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>压缩包根目录必须包含 <code>SKILL.md</code>。</li>
              <li>建议保持清晰的 slug 与版本号，便于后续多版本发布。</li>
              <li>更新已有技能时请保持 <code>slug</code> 不变，只提升 <code>version</code>。</li>
              <li>支持附带 <code>assets/</code>、<code>templates/</code> 等辅助文件。</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.35)]">
          <PublishForm
            initialSubmitted={resolvedSearchParams.submitted}
            initialError={resolvedSearchParams.error}
            initialSlug={resolvedSearchParams.slug}
            mode={isUpdateMode ? "update" : "create"}
            versionHint={resolvedSearchParams.latestVersion ? `例如：在 ${resolvedSearchParams.latestVersion} 基础上递增` : undefined}
            initialValues={{
              displayName: resolvedSearchParams.displayName,
              slug: resolvedSearchParams.slug,
              category: resolvedSearchParams.category,
              summary: resolvedSearchParams.summary,
              tags: resolvedSearchParams.tags,
              authorName: resolvedSearchParams.authorName,
              authorEmail: resolvedSearchParams.authorEmail,
              changelog: resolvedSearchParams.changelog,
            }}
          />
        </div>
      </section>
    </AppShell>
  );
}
