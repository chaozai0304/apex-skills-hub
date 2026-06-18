import { AppShell } from "@/components/app-shell";
import { PublishForm } from "@/components/publish-form";
import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getAdminProfile, listProjectOptions } from "@/lib/store";
import { redirect } from "next/navigation";

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
    project?: string;
    submissionId?: string;
  }>;
};

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const resolvedSearchParams = await searchParams;
  const [locale, user, isAdmin, adminProfile, projects] = await Promise.all([
    getCurrentLocale(),
    getCurrentUser(),
    isAdminAuthenticated(),
    getAdminProfile(),
    listProjectOptions(),
  ]);
  if (!user && !isAdmin) {
    redirect("/login?next=/publish");
  }

  const isUpdateMode = resolvedSearchParams.mode === "update";
  const useAdminActor = isAdmin && !resolvedSearchParams.submissionId;
  const actorName = useAdminActor
    ? adminProfile.displayName || "超级管理员"
    : user?.displayName || user?.username || "超级管理员";
  const actorEmail = useAdminActor
    ? adminProfile.email || "superadmin@apexhub.local"
    : user?.email || "superadmin@apexhub.local";

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_45px_-34px_rgba(15,23,42,0.35)]">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Publish Skill
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {isUpdateMode ? pick(locale, "提交技能新版本", "Submit a new skill version") : pick(locale, "在线上传你的 Skill", "Upload your skill online")}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {isUpdateMode
              ? pick(locale, "保持原有 slug、不重复使用旧版本号，提交新的 ZIP 包后将进入待审批队列。审批通过后，详情页和 registry API 都会自动以最新发布版本为默认结果。", "Keep the original slug, avoid reusing an old version number, and upload a new ZIP package. After review, the detail page and registry API will automatically resolve to the latest published version.")
              : pick(locale, "上传 ZIP 包后将进入待审批队列。管理员审核通过后，技能会自动进入搜索页、详情页与 registry API。", "After uploading a ZIP package, the skill enters the review queue. Once approved, it automatically appears in search, detail pages, and the registry API.")}
          </p>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            <div className="font-semibold text-slate-900">{isUpdateMode ? pick(locale, "版本更新说明", "Version update guidance") : pick(locale, "提交要求", "Submission requirements")}</div>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>{pick(locale, "压缩包根目录必须包含 ", "The ZIP root must contain ")}<code>SKILL.md</code>。</li>
              <li>{pick(locale, "建议保持清晰的 slug 与版本号，便于后续多版本发布。", "Use a clear slug and version scheme so future releases remain easy to manage.")}</li>
              <li>{pick(locale, "更新已有技能时请保持 ", "When updating an existing skill, keep the ")}<code>slug</code>{pick(locale, " 不变，只提升 ", " unchanged and only increment the ")}<code>version</code>。</li>
              <li>{pick(locale, "支持附带 ", "You can include supporting files such as ")}<code>assets/</code>、<code>templates/</code>{pick(locale, " 等辅助文件。", ".")}</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_45px_-34px_rgba(15,23,42,0.35)]">
          <PublishForm
            initialSubmitted={resolvedSearchParams.submitted}
            initialError={resolvedSearchParams.error}
            initialSlug={resolvedSearchParams.slug}
            submissionId={resolvedSearchParams.submissionId}
            mode={isUpdateMode ? "update" : "create"}
            versionHint={resolvedSearchParams.latestVersion ? `例如：在 ${resolvedSearchParams.latestVersion} 基础上递增` : undefined}
            initialValues={{
              projectId: resolvedSearchParams.project,
              displayName: resolvedSearchParams.displayName,
              slug: resolvedSearchParams.slug,
              category: resolvedSearchParams.category,
              summary: resolvedSearchParams.summary,
              tags: resolvedSearchParams.tags,
              authorName: resolvedSearchParams.authorName || actorName,
              authorEmail: resolvedSearchParams.authorEmail || actorEmail,
              changelog: resolvedSearchParams.changelog,
            }}
            projects={projects}
            locale={locale}
          />
        </div>
      </section>
    </AppShell>
  );
}
