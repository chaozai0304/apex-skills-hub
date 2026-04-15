import { AppShell } from "@/components/app-shell";
import { PublishForm } from "@/components/publish-form";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

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
  const locale = await getCurrentLocale();
  const isUpdateMode = resolvedSearchParams.mode === "update";

  return (
    <AppShell>
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.35)]">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Publish Skill
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {isUpdateMode ? pick(locale, "提交技能新版本", "Submit a new skill version") : pick(locale, "在线上传你的 Skill", "Upload your skill online")}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {isUpdateMode
              ? pick(locale, "保持原有 slug、不重复使用旧版本号，提交新的 ZIP 包后将进入待审批队列。审批通过后，详情页和 registry API 都会自动以最新发布版本为默认结果。", "Keep the original slug, avoid reusing an old version number, and upload a new ZIP package. After review, the detail page and registry API will automatically resolve to the latest published version.")
              : pick(locale, "上传 ZIP 包后将进入待审批队列。管理员审核通过后，技能会自动进入搜索页、详情页与 registry API。", "After uploading a ZIP package, the skill enters the review queue. Once approved, it automatically appears in search, detail pages, and the registry API.")}
          </p>

          <div className="mt-8 rounded-3xl bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            <div className="font-semibold text-slate-900">{isUpdateMode ? pick(locale, "版本更新说明", "Version update guidance") : pick(locale, "提交要求", "Submission requirements")}</div>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>{pick(locale, "压缩包根目录必须包含 ", "The ZIP root must contain ")}<code>SKILL.md</code>。</li>
              <li>{pick(locale, "建议保持清晰的 slug 与版本号，便于后续多版本发布。", "Use a clear slug and version scheme so future releases remain easy to manage.")}</li>
              <li>{pick(locale, "更新已有技能时请保持 ", "When updating an existing skill, keep the ")}<code>slug</code>{pick(locale, " 不变，只提升 ", " unchanged and only increment the ")}<code>version</code>。</li>
              <li>{pick(locale, "支持附带 ", "You can include supporting files such as ")}<code>assets/</code>、<code>templates/</code>{pick(locale, " 等辅助文件。", ".")}</li>
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
            locale={locale}
          />
        </div>
      </section>
    </AppShell>
  );
}
