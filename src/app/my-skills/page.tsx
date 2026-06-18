import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { pick, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getUserDashboard } from "@/lib/store";
import type { SubmissionRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SUBMISSION_PAGE_SIZE = 8;

type SubmissionFilter = "all" | SubmissionRecord["status"];
type WorkspaceTab = "published" | "reviews";

type SkillGroup = {
  slug: string;
  latest: SubmissionRecord;
  versions: SubmissionRecord[];
  pendingCount: number;
  publishedCount: number;
  rejectedCount: number;
};

type MySkillsPageProps = {
  searchParams: Promise<{
    accountSuccess?: string;
    accountError?: string;
    skillDeleted?: string;
    skillUpdated?: string;
    skillError?: string;
    q?: string;
    status?: string;
    tab?: string;
    page?: string;
  }>;
};

export default async function MySkillsPage({ searchParams }: MySkillsPageProps) {
  const locale = await getCurrentLocale();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/my-skills");
  }

  const [dashboard, resolvedSearchParams] = await Promise.all([
    getUserDashboard(user.id),
    searchParams,
  ]);
  const keyword = resolvedSearchParams.q?.trim() ?? "";
  const status = normalizeSubmissionFilter(resolvedSearchParams.status);
  const activeTab = normalizeWorkspaceTab(resolvedSearchParams.tab);
  const page = normalizePage(resolvedSearchParams.page);
  const authoredGroups = groupSkillSubmissions(dashboard.submissions);
  const reviewGroups = groupSkillSubmissions(dashboard.reviewSubmissions);
  const filteredAuthoredGroups = applyGroupFilters(authoredGroups, keyword, status);
  const filteredReviewGroups = applyGroupFilters(reviewGroups, keyword, "pending");
  const activeGroups = activeTab === "reviews" ? filteredReviewGroups : filteredAuthoredGroups;
  const paginatedGroups = paginate(activeGroups, page, SUBMISSION_PAGE_SIZE);
  const counts = getSubmissionGroupCounts(authoredGroups);

  return (
    <AppShell>
      <section className="section-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-eyebrow">Workspace</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {pick(locale, "我的技能工作台", "My Skills Workspace")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {pick(locale, `欢迎回来，${user.displayName}。这里集中管理你提交、收藏和评分过的 Skills。`, `Welcome back, ${user.displayName}. Manage submitted, favorited, and rated skills here.`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/publish" className="button-primary h-9 px-4 text-xs">
              {pick(locale, "发布新技能", "Publish new skill")}
            </Link>
            <Link href="/publish?mode=update" className="button-secondary h-9 px-4 text-xs">
              {pick(locale, "提交新版本", "Submit new version")}
            </Link>
          </div>
        </div>
      </section>

      <FeedbackMessages params={resolvedSearchParams} locale={locale} />

      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="section-eyebrow">Submissions</div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {activeTab === "reviews" ? pick(locale, "我需要审批的技能", "Skills to review") : pick(locale, "我发布的技能", "My published skills")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {activeTab === "reviews"
                  ? pick(locale, "这里只展示你负责项目下的待审批技能，可直接审批发布或驳回退回。", "Only pending skills from projects you manage are shown here for approval or rejection.")
                  : pick(locale, "同一个技能按 slug 合并展示，多个版本收纳在版本明细中。", "Skills with the same slug are grouped, with versions folded into details.")}
              </p>
            </div>
            <form method="get" className="flex w-full flex-col gap-2 md:flex-row xl:max-w-2xl">
              <input type="hidden" name="tab" value={activeTab} />
              {activeTab === "published" ? (
                <select name="status" defaultValue={status} className="field-input h-9 md:w-36">
                  <option value="all">全部状态</option>
                  <option value="pending">待审批</option>
                  <option value="rejected">已驳回</option>
                  <option value="published">已发布</option>
                </select>
              ) : null}
              <input
                name="q"
                defaultValue={keyword}
                placeholder="搜索标题、slug、项目、分类"
                className="field-input h-9 flex-1"
              />
              <button className="button-primary h-9 px-4 text-xs">筛选</button>
            </form>
          </div>

          <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
            {[
              { key: "published" as const, label: "我发布的技能", count: authoredGroups.length },
              { key: "reviews" as const, label: "我需要审批", count: reviewGroups.length },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={buildWorkspaceHref({ tab: tab.key, status, keyword, page: 1 })}
                className={`inline-flex h-8 items-center gap-2 rounded-xl px-3 transition ${activeTab === tab.key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {tab.label}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">{tab.count}</span>
              </Link>
            ))}
          </div>

          {activeTab === "published" ? <div className="mt-4 grid gap-2 md:grid-cols-4">
            {[
              { label: "全部", value: counts.all, href: buildWorkspaceHref({ tab: activeTab, status: "all", keyword, page: 1 }), active: status === "all" },
              { label: "待审批", value: counts.pending, href: buildWorkspaceHref({ tab: activeTab, status: "pending", keyword, page: 1 }), active: status === "pending" },
              { label: "已驳回", value: counts.rejected, href: buildWorkspaceHref({ tab: activeTab, status: "rejected", keyword, page: 1 }), active: status === "rejected" },
              { label: "已发布", value: counts.published, href: buildWorkspaceHref({ tab: activeTab, status: "published", keyword, page: 1 }), active: status === "published" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-2xl border px-4 py-3 transition ${item.active ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-sky-100 hover:bg-white"}`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{item.value}</div>
              </Link>
            ))}
          </div> : null}
        </div>

        <div className="compact-table overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">技能</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">项目</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">版本</th>
                <th className="px-4 py-3">审批意见</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/90">
              {paginatedGroups.items.map((group) => (
                <tr key={group.slug} className="align-middle hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-950">{group.latest.displayName}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{group.slug}</div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{group.latest.summary}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={group.latest.status} />
                    <div className="mt-1 text-[11px] text-slate-400">共 {group.versions.length} 版</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                      {group.latest.projectName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{group.latest.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <summary className="cursor-pointer list-none font-semibold text-slate-800">
                        最新 {group.latest.version}
                      </summary>
                      <div className="mt-2 grid gap-1.5">
                        {group.versions.map((version) => (
                          <div key={version.id} className="rounded-lg bg-white px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">{version.version}</span>
                              <StatusBadge status={version.status} />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">{formatDateTime(version.updatedAt, locale)}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-slate-500">
                    {group.latest.reviewNotes ? (
                      <span className="line-clamp-2 rounded-xl bg-amber-50 px-2.5 py-1 text-amber-800">{group.latest.reviewNotes}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {activeTab === "reviews" ? (
                      <ReviewActions item={group.latest} locale={locale} />
                    ) : (
                      <SubmissionActions group={group} locale={locale} />
                    )}
                  </td>
                </tr>
              ))}

              {!paginatedGroups.items.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    {activeTab === "reviews" ? "当前没有需要你审批的技能。" : keyword || status !== "all" ? "没有匹配的发布记录。" : "你还没有提交过技能。"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            共 {activeGroups.length} 个技能，当前第 {paginatedGroups.page} / {paginatedGroups.totalPages} 页
          </div>
          {paginatedGroups.totalPages > 1 ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildWorkspaceHref({ tab: activeTab, status, keyword, page: Math.max(1, paginatedGroups.page - 1) })}
                className={`button-secondary h-9 px-3 text-xs ${paginatedGroups.page === 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                上一页
              </Link>
              {Array.from({ length: paginatedGroups.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildWorkspaceHref({ tab: activeTab, status, keyword, page: pageNumber })}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-xs font-semibold ${pageNumber === paginatedGroups.page ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"}`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={buildWorkspaceHref({ tab: activeTab, status, keyword, page: Math.min(paginatedGroups.totalPages, paginatedGroups.page + 1) })}
                className={`button-secondary h-9 px-3 text-xs ${paginatedGroups.page === paginatedGroups.totalPages ? "pointer-events-none opacity-40" : ""}`}
              >
                下一页
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card p-5">
          <div className="section-eyebrow">Account</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{pick(locale, "账户资料", "Account profile")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ProfileStat label={pick(locale, "显示名称", "Display name")} value={user.displayName} />
            <ProfileStat label={pick(locale, "用户名", "Username")} value={user.username} />
            <ProfileStat label={pick(locale, "加入时间", "Joined")} value={formatDateTime(user.createdAt, locale)} />
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="section-eyebrow">Security</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{pick(locale, "修改密码", "Change password")}</h2>
          <form action="/api/account/password" method="post" className="mt-4 grid gap-3">
            <input name="currentPassword" type="password" required placeholder={pick(locale, "当前密码", "Current password")} className="field-input" />
            <input name="nextPassword" type="password" required minLength={6} placeholder={pick(locale, "新密码", "New password")} className="field-input" />
            <input name="confirmPassword" type="password" required minLength={6} placeholder={pick(locale, "确认新密码", "Confirm new password")} className="field-input" />
            <button type="submit" className="button-primary h-10 text-xs">
              {pick(locale, "更新密码", "Update password")}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <CompactCollection title={pick(locale, "我的收藏", "My favorites")} empty={pick(locale, "你还没有收藏任何技能。", "You have not favorited any skills yet.")}> 
          {dashboard.favorites.map((item) => (
            <CompactSkillLink key={item.id} href={`/skills/${item.slug}`} title={item.displayName} meta={`${item.slug} · ${item.version}`} summary={item.summary} />
          ))}
        </CompactCollection>

        <CompactCollection title={pick(locale, "我的评分", "My ratings")} empty={pick(locale, "你还没有给任何技能评分。", "You have not rated any skills yet.")}> 
          {dashboard.ratings.map((item) => (
            <CompactSkillLink key={item.submission.id} href={`/skills/${item.submission.slug}`} title={item.submission.displayName} meta={`${item.submission.slug} · ${pick(locale, "评分", "Rating")} ${item.rating}/5`} summary={formatDateTime(item.updatedAt, locale)} />
          ))}
        </CompactCollection>
      </section>
    </AppShell>
  );
}

function SubmissionActions({ group, locale }: { group: SkillGroup; locale: Locale }) {
  const item = group.latest;
  const rejected = group.versions.find((version) => version.status === "rejected");
  const removable = group.versions.find((version) => version.status === "pending" || version.status === "rejected");
  return (
    <div className="grid gap-1.5">
      {item.status === "published" ? (
        <>
          <Link href={`/skills/${item.slug}`} className="button-secondary h-8 px-3 text-[11px]">
            {pick(locale, "详情", "Details")}
          </Link>
          <Link href={buildEditHref(item, false)} className="button-primary h-8 px-3 text-[11px]">
            {pick(locale, "再发版本", "New version")}
          </Link>
        </>
      ) : null}
      {rejected ? (
        <Link href={buildEditHref(rejected, true)} className="button-primary h-8 px-3 text-[11px]">
          {pick(locale, "修改重提", "Edit")}
        </Link>
      ) : null}
      {removable ? (
        <form action={`/api/submissions/${removable.id}/delete`} method="post" data-loading-message="正在删除技能提交...">
          <button type="submit" className="inline-flex h-8 w-full items-center justify-center rounded-full border border-rose-100 bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">
            {pick(locale, "删除", "Delete")}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function ReviewActions({ item, locale }: { item: SubmissionRecord; locale: Locale }) {
  return (
    <div className="grid gap-1.5">
      <Link href={`/admin/submissions/${item.id}?backTo=${encodeURIComponent("/my-skills?tab=reviews")}`} className="button-secondary h-8 px-3 text-[11px]">
        {pick(locale, "查看内容", "Preview")}
      </Link>
      <a href={`/api/admin/submissions/${item.id}/download`} className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700">
        {pick(locale, "下载 ZIP", "Download ZIP")}
      </a>
      <form action={`/api/admin/review/${item.id}`} method="post" className="grid gap-1.5" data-loading-message="正在提交审批结果...">
        <input type="hidden" name="redirectTo" value="/my-skills?tab=reviews" />
        <textarea
          name="reviewNotes"
          rows={2}
          placeholder={pick(locale, "审批意见", "Review notes")}
          className="h-14 resize-none rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] outline-none focus:border-sky-300 focus:bg-white"
        />
        <button name="decision" value="approve" className="inline-flex h-8 items-center justify-center rounded-full bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500">
          {pick(locale, "审批发布", "Approve")}
        </button>
        <button name="decision" value="reject" className="inline-flex h-8 items-center justify-center rounded-full border border-rose-100 bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">
          {pick(locale, "驳回", "Reject")}
        </button>
      </form>
    </div>
  );
}

function FeedbackMessages({ params, locale }: { params: Awaited<MySkillsPageProps["searchParams"]>; locale: Locale }) {
  return (
    <>
      {params.accountSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
          {pick(locale, "密码已更新，下次登录请使用新密码。", "Password updated successfully. Please use the new password next time you sign in.")}
        </div>
      ) : null}
      {params.skillDeleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">{params.skillDeleted}</div>
      ) : null}
      {params.skillUpdated ? (
        <div className="whitespace-pre-line rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">{params.skillUpdated}</div>
      ) : null}
      {params.accountError || params.skillError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          {params.accountError || params.skillError}
        </div>
      ) : null}
    </>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function CompactCollection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="surface-card p-5">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? items : <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">{empty}</div>}
      </div>
    </div>
  );
}

function CompactSkillLink({ href, title, meta, summary }: { href: string; title: string; meta: string; summary: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-sky-100 hover:bg-white">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{meta}</div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{summary}</p>
    </Link>
  );
}

function buildEditHref(item: SubmissionRecord, includeSubmissionId: boolean) {
  const params = new URLSearchParams({
    mode: "update",
    project: item.projectId,
    slug: item.slug,
    displayName: item.displayName,
    category: item.category,
    summary: item.summary,
    tags: item.tags.join(", "),
    changelog: item.changelog,
    authorName: item.authorName,
    authorEmail: item.authorEmail,
  });

  if (includeSubmissionId && item.status === "rejected") {
    params.set("submissionId", item.id);
  }

  return `/publish?${params.toString()}`;
}

function groupSkillSubmissions(items: SubmissionRecord[]): SkillGroup[] {
  const groups = new Map<string, SubmissionRecord[]>();
  for (const item of items) {
    groups.set(item.slug, [...(groups.get(item.slug) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([slug, versions]) => {
      const sorted = versions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return {
        slug,
        latest: sorted[0],
        versions: sorted,
        pendingCount: sorted.filter((item) => item.status === "pending").length,
        publishedCount: sorted.filter((item) => item.status === "published").length,
        rejectedCount: sorted.filter((item) => item.status === "rejected").length,
      };
    })
    .sort((a, b) => new Date(b.latest.updatedAt).getTime() - new Date(a.latest.updatedAt).getTime());
}

function applyGroupFilters(items: SkillGroup[], keyword: string, status: SubmissionFilter) {
  const normalized = keyword.trim().toLowerCase();
  return items.filter((group) => {
    const statusMatched = status === "all" || group.versions.some((item) => item.status === status);
    if (!statusMatched) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return group.versions.some((item) =>
      [item.displayName, item.slug, item.projectName, item.category, item.summary, ...item.tags]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  });
}

function getSubmissionGroupCounts(items: SkillGroup[]) {
  return {
    all: items.length,
    pending: items.filter((group) => group.pendingCount > 0).length,
    rejected: items.filter((group) => group.rejectedCount > 0).length,
    published: items.filter((group) => group.publishedCount > 0).length,
  };
}

function normalizeSubmissionFilter(value?: string): SubmissionFilter {
  return value === "pending" || value === "rejected" || value === "published" ? value : "all";
}

function normalizeWorkspaceTab(value?: string): WorkspaceTab {
  return value === "reviews" ? "reviews" : "published";
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

function buildWorkspaceHref(input: { tab: WorkspaceTab; status: SubmissionFilter; keyword: string; page: number }) {
  const params = new URLSearchParams({ tab: input.tab, page: String(input.page) });
  if (input.tab === "published" && input.status !== "all") {
    params.set("status", input.status);
  }
  if (input.keyword.trim()) {
    params.set("q", input.keyword.trim());
  }
  return `/my-skills?${params.toString()}`;
}
