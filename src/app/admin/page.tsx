import { Activity, RefreshCw, ShieldCheck, Trash2, UserRoundCog, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { GitLabSyncForm } from "@/components/gitlab-sync-form";
import { StatusBadge } from "@/components/status-badge";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDashboardData, getGitLabSyncConfigSummary } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ADMIN_TABS = [
  { key: "pending", label: "待审批", icon: ShieldCheck },
  { key: "users", label: "用户管理", icon: UserRoundCog },
  { key: "skills", label: "技能列表", icon: Trash2 },
  { key: "logs", label: "审批日志", icon: Activity },
  { key: "sync", label: "同步配置", icon: RefreshCw },
] as const;

type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

const PAGE_SIZE = 6;

const LOG_ACTION_LABELS: Record<string, string> = {
  "skill-submitted": "提交技能",
  "skill-approved": "审批发布",
  "skill-rejected": "驳回技能",
  "skill-deleted": "删除技能",
  "gitlab-sync-succeeded": "同步成功",
  "gitlab-sync-failed": "同步失败",
  "user-created": "创建用户",
  "user-enabled": "启用用户",
  "user-disabled": "停用用户",
  "password-changed": "修改密码",
};

type AdminPageProps = {
  searchParams: Promise<{
    userCreated?: string;
    userUpdated?: string;
    userError?: string;
    skillDeleted?: string;
    skillError?: string;
    syncSaved?: string;
    syncError?: string;
    syncTestSuccess?: string;
    syncTestError?: string;
    syncTokenReset?: string;
    gitlabSyncSuccess?: string;
    gitlabSyncError?: string;
    tab?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    redirect("/admin/login?next=/admin");
  }

  const resolvedSearchParams = await searchParams;
  const [{ pending, recentPublished, users, logs, allSkills }, gitLabSync] = await Promise.all([
    getDashboardData(),
    getGitLabSyncConfigSummary(),
  ]);
  const activeTab = isAdminTabKey(resolvedSearchParams.tab) ? resolvedSearchParams.tab : "pending";
  const query = resolvedSearchParams.q?.trim() ?? "";
  const page = normalizePage(resolvedSearchParams.page);

  const pendingItems = applyPendingQuery(pending, query);
  const userItems = applyUserQuery(users, query);
  const allSkillGroups = groupManagedSkills(allSkills);
  const matchedSkillSlugs = new Set(applySkillQuery(allSkills, query).map((item) => item.slug));
  const skillItems = groupManagedSkills(
    query ? allSkills.filter((item) => matchedSkillSlugs.has(item.slug)) : allSkills,
  );
  const logItems = applyLogQuery(logs, query);

  const currentItemsCountByTab: Record<AdminTabKey, number> = {
    pending: pendingItems.length,
    users: userItems.length,
    skills: skillItems.length,
    logs: logItems.length,
    sync: 1,
  };

  const paginatedPending = paginate(pendingItems, page, PAGE_SIZE);
  const paginatedUsers = paginate(userItems, page, PAGE_SIZE);
  const paginatedSkills = paginate(skillItems, page, PAGE_SIZE);
  const paginatedLogs = paginate(logItems, page, PAGE_SIZE);
  const activePagination =
    activeTab === "pending"
      ? { page: paginatedPending.page, totalPages: paginatedPending.totalPages }
      : activeTab === "users"
        ? { page: paginatedUsers.page, totalPages: paginatedUsers.totalPages }
        : activeTab === "skills"
          ? { page: paginatedSkills.page, totalPages: paginatedSkills.totalPages }
            : activeTab === "logs"
              ? { page: paginatedLogs.page, totalPages: paginatedLogs.totalPages }
              : { page: 1, totalPages: 1 };

  const activeCount = currentItemsCountByTab[activeTab];
  const activeTitle =
    activeTab === "pending"
      ? "待审批队列"
      : activeTab === "users"
        ? "普通用户管理"
        : activeTab === "skills"
          ? "技能列表管理"
          : activeTab === "logs"
            ? "审批日志"
            : "GitLab 同步配置";
  const activeDescription =
    activeTab === "pending"
      ? "集中处理待审批技能，支持按标题、slug、作者进行搜索并分页查看。"
      : activeTab === "users"
        ? "集中查看普通用户状态，支持搜索、分页和行级启停操作。"
        : activeTab === "skills"
          ? "按 slug 合并维护技能，支持查看多个版本，并可在删除时选择是否同步清理 GitLab 镜像目录。"
          : activeTab === "logs"
            ? "按时间倒序查看关键操作日志，支持检索操作者、动作、目标与消息内容。"
            : "配置一个 GitLab 目录页地址和授权码，审批发布成功后会把技能文件自动同步到对应目录；同名技能会直接更新。";
  const currentAdminHref = buildAdminHref(activeTab, query, activePagination.page);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">Review Console</div>
        <h1 className="section-title mt-3">超级管理员审批控制台</h1>
        <p className="section-description mt-4 max-w-3xl">
          处理作者提交的 skills，决定是否发布到公开目录与 registry API。现在还支持用户状态管理、技能删除以及审批日志追踪，控制台终于不只是“点通过”的单按钮宇宙了。
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        {[
          { label: "待审批", value: String(pending.length), icon: ShieldCheck },
          { label: "已建用户", value: String(users.length), icon: Users },
          { label: "可管理技能", value: String(allSkillGroups.length), icon: Trash2 },
          { label: "最近日志", value: String(logs.length), icon: Activity },
        ].map((item) => (
          <div key={item.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-500">{item.label}</div>
              <item.icon className="h-5 w-5 text-sky-700" />
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
          </div>
        ))}
      </section>

      {resolvedSearchParams.userCreated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          普通用户创建成功。
        </div>
      ) : null}

      {resolvedSearchParams.userUpdated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          用户状态已更新。
        </div>
      ) : null}

      {resolvedSearchParams.userError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {resolvedSearchParams.userError}
        </div>
      ) : null}

      {resolvedSearchParams.skillDeleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {resolvedSearchParams.skillDeleted}
        </div>
      ) : null}

      {resolvedSearchParams.skillError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {resolvedSearchParams.skillError}
        </div>
      ) : null}

      {resolvedSearchParams.syncSaved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          GitLab 同步配置已保存。
        </div>
      ) : null}

      {resolvedSearchParams.syncError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {resolvedSearchParams.syncError}
        </div>
      ) : null}

      {resolvedSearchParams.syncTestSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {resolvedSearchParams.syncTestSuccess}
        </div>
      ) : null}

      {resolvedSearchParams.syncTestError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {resolvedSearchParams.syncTestError}
        </div>
      ) : null}

      {resolvedSearchParams.syncTokenReset ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          GitLab Token 已重置，自动同步已暂停；请重新填写后保存。
        </div>
      ) : null}

      {resolvedSearchParams.gitlabSyncSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {resolvedSearchParams.gitlabSyncSuccess}
        </div>
      ) : null}

      {resolvedSearchParams.gitlabSyncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {resolvedSearchParams.gitlabSyncError}
        </div>
      ) : null}

      <section className="section-card">
        <div className="flex flex-wrap gap-3">
          {ADMIN_TABS.map((tab) => {
            const href = buildAdminHref(tab.key, query, 1);
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-slate-950 !text-white shadow-[0_14px_35px_-20px_rgba(15,23,42,0.6)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/10 !text-white" : "bg-slate-100 text-slate-500"}`}>
                  {tab.key === "pending"
                    ? pending.length
                    : tab.key === "users"
                      ? users.length
                      : tab.key === "skills"
                        ? allSkillGroups.length
                        : tab.key === "logs"
                          ? logs.length
                          : 1}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{activeTitle}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">{activeDescription}</p>
          </div>

          {activeTab !== "sync" ? (
            <form className="flex w-full max-w-xl gap-3" action="/admin" method="get">
              <input type="hidden" name="tab" value={activeTab} />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder={getSearchPlaceholder(activeTab)}
                className="field-input h-12 flex-1"
              />
              <button type="submit" className="button-primary h-12 px-5 text-sm">
                搜索
              </button>
            </form>
          ) : null}
        </div>

        {activeTab === "users" ? (
          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6">
            <div className="mb-4 flex items-center gap-3">
              <UserRoundCog className="h-5 w-5 text-sky-700" />
              <h3 className="text-lg font-semibold text-slate-950">创建普通用户</h3>
            </div>
            <form action="/api/admin/users" method="post" className="grid gap-4">
              <input type="hidden" name="intent" value="create" />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  用户名
                  <input name="username" required className="field-input" />
                </label>
                <label className="grid gap-2 text-sm text-slate-600">
                  显示名称
                  <input name="displayName" required className="field-input" />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-slate-600">
                初始密码
                <input name="password" type="password" required className="field-input" />
              </label>
              <button type="submit" className="button-primary h-12 px-6 text-sm">
                创建普通用户
              </button>
            </form>
          </div>
        ) : null}

        {activeTab === "sync" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-950">GitLab 同步参数</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                请填写 GitLab 仓库目录页地址，例如 <code>http://host/group/project/-/tree/master/.github/skills</code>。
                系统会在该目录下以 <code>{`<slug>/`}</code> 为子目录同步技能文件。
              </p>

              {gitLabSync.issue ? (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${gitLabSync.storageReady === false ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {gitLabSync.issue}
                </div>
              ) : null}

              <GitLabSyncForm summary={gitLabSync} />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-6">
              <h3 className="text-lg font-semibold text-slate-950">当前状态</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                  <span>同步状态</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gitLabSync.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {gitLabSync.enabled ? "已启用" : "未启用"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                  <span>Token</span>
                  <div className="flex items-center gap-3">
                    {gitLabSync.maskedToken ? <span className="text-xs text-slate-500">{gitLabSync.maskedToken}</span> : null}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gitLabSync.hasToken ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {gitLabSync.hasToken ? "已保存" : "未配置"}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Project</div>
                  <div className="mt-2 font-medium text-slate-900">{gitLabSync.projectPath || "尚未解析"}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Branch</div>
                    <div className="mt-2 font-medium text-slate-900">{gitLabSync.branch || "尚未解析"}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Base Path</div>
                    <div className="mt-2 font-medium text-slate-900 break-all">{gitLabSync.basePath || "/"}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">最近更新</div>
                  <div className="mt-2 font-medium text-slate-900">{gitLabSync.updatedAt ? formatDateTime(gitLabSync.updatedAt) : "尚未保存配置"}</div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Storage</div>
                  <div className="mt-2 font-medium text-slate-900">{gitLabSync.storageReady === false ? "等待数据库迁移" : "配置表可用"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-200">
          {activeTab === "pending" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">技能</th>
                  <th className="px-4 py-3">作者</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">提交时间</th>
                  <th className="px-4 py-3">审核备注</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedPending.items.length ? (
                  paginatedPending.items.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">{item.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.slug} · {item.version}</div>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{item.summary}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.authorName}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                        <div className="mt-2 text-xs text-slate-500">{item.category}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-4 min-w-[16rem]">
                        <form action={`/api/admin/review/${item.id}`} method="post" className="grid gap-3">
                          <textarea name="reviewNotes" rows={3} defaultValue={item.reviewNotes} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-300 focus:bg-white" />
                          <div className="flex flex-wrap gap-2">
                            <button name="decision" value="approve" className="h-10 rounded-2xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500">
                              审批发布
                            </button>
                            <button name="decision" value="reject" className="h-10 rounded-2xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-500">
                              驳回退回
                            </button>
                          </div>
                        </form>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">文件数 {item.fileCount}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6} text={query ? "没有匹配的待审批技能。" : "当前没有待审批记录。"} />
                )}
              </tbody>
            </table>
          ) : null}

          {activeTab === "users" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">用户名</th>
                  <th className="px-4 py-3">显示名称</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedUsers.items.length ? (
                  paginatedUsers.items.map((user) => (
                    <tr key={user.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-4 py-4 font-medium text-slate-900">{user.username}</td>
                      <td className="px-4 py-4">{user.displayName}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {user.disabled ? "已停用" : "正常可用"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-4">
                        <form action="/api/admin/users" method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="disabled" value={user.disabled ? "false" : "true"} />
                          <button type="submit" className={`${user.disabled ? "button-primary" : "button-secondary"} h-10 px-4 text-sm whitespace-nowrap`}>
                            {user.disabled ? "重新启用" : "停用账户"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5} text={query ? "没有匹配的用户记录。" : "当前没有用户记录。"} />
                )}
              </tbody>
            </table>
          ) : null}

          {activeTab === "skills" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">技能</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">更新时间</th>
                  <th className="px-4 py-3">下载</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedSkills.items.length ? (
                  paginatedSkills.items.map((item) => (
                    <tr key={item.slug} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">{item.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.slug} · 最新 {item.latestVersion} · 共 {item.versionCount} 个版本
                        </div>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{item.summary}</p>

                        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                            查看版本明细
                          </summary>
                          <div className="mt-3 space-y-3">
                            {item.versions.map((version) => (
                              <div key={version.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-slate-900">{version.version}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {formatDateTime(version.updatedAt)} · 文件数 {version.fileCount} · 下载 {version.downloads}
                                    </div>
                                  </div>
                                  <StatusBadge status={version.status} />
                                </div>
                                {version.reviewNotes ? (
                                  <p className="mt-3 text-xs leading-6 text-slate-500">审核备注：{version.reviewNotes}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                        <div className="mt-2 text-xs text-slate-500">
                          已发布 {item.publishedCount} · 待审批 {item.pendingCount} · 已驳回 {item.rejectedCount}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500">{formatDateTime(item.updatedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.totalDownloads}</td>
                      <td className="px-4 py-4 min-w-[18rem]">
                        <form action={`/api/admin/skills/${item.id}/delete`} method="post" className="grid gap-3">
                          <input type="hidden" name="redirectTo" value={currentAdminHref} />
                          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            <input type="checkbox" name="deleteFromGitLab" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                            <span>同时删除 GitLab 仓库中的同名技能目录（默认不删除，仅勾选时执行）</span>
                          </label>
                          <div className="text-xs leading-5 text-slate-500">删除将移除该技能的全部版本记录及本地归档文件。</div>
                          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500">
                            <Trash2 className="h-4 w-4" />
                            删除整组技能
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6} text={query ? "没有匹配的技能记录。" : "当前没有技能记录。"} />
                )}
              </tbody>
            </table>
          ) : null}

          {activeTab === "logs" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-3">时间</th>
                  <th className="px-6 py-3">动作</th>
                  <th className="px-6 py-3">操作者</th>
                  <th className="px-6 py-3">目标</th>
                  <th className="px-6 py-3 min-w-[22rem]">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedLogs.items.length ? (
                  paginatedLogs.items.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {LOG_ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{log.actorName}</td>
                      <td className="px-6 py-4 text-slate-500">{log.targetLabel}</td>
                      <td className="px-6 py-4 text-slate-700">{log.message}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5} text={query ? "没有匹配的日志记录。" : "当前没有审批日志。"} />
                )}
              </tbody>
            </table>
          ) : null}
        </div>
        )}

        <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {activeCount ? `共 ${activeCount} 条，当前第 ${activePagination.page} / ${activePagination.totalPages} 页` : "暂无可展示数据"}
          </div>

          {activePagination.totalPages > 1 ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildAdminHref(activeTab, query, Math.max(1, activePagination.page - 1))}
                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold ${activePagination.page === 1 ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "button-secondary"}`}
                aria-disabled={activePagination.page === 1}
              >
                上一页
              </Link>
              {Array.from({ length: activePagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildAdminHref(activeTab, query, pageNumber)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-semibold ${pageNumber === activePagination.page ? "bg-slate-950 !text-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.7)]" : "button-secondary"}`}
                  aria-current={pageNumber === activePagination.page ? "page" : undefined}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={buildAdminHref(activeTab, query, Math.min(activePagination.totalPages, activePagination.page + 1))}
                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold ${activePagination.page === activePagination.totalPages ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "button-secondary"}`}
                aria-disabled={activePagination.page === activePagination.totalPages}
              >
                下一页
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {activeTab === "skills" && recentPublished.length ? (
        <section className="surface-card p-8">
          <div className="section-eyebrow">Latest Published</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近发布</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentPublished.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{item.displayName}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.slug} · {item.version}</div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function isAdminTabKey(value?: string): value is AdminTabKey {
  return ADMIN_TABS.some((tab) => tab.key === value);
}

function normalizePage(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildAdminHref(tab: AdminTabKey, q: string, page: number) {
  const params = new URLSearchParams({ tab, page: String(page) });
  if (q.trim()) {
    params.set("q", q.trim());
  }
  return `/admin?${params.toString()}`;
}

function getSearchPlaceholder(tab: AdminTabKey) {
  switch (tab) {
    case "pending":
      return "搜索标题、slug、作者";
    case "users":
      return "搜索用户名或显示名称";
    case "skills":
      return "搜索技能名、slug、分类";
    case "logs":
      return "搜索动作、操作者、目标或说明";
    case "sync":
      return "同步配置不需要搜索";
  }
}

function includesKeyword(values: Array<string | undefined>, keyword: string) {
  if (!keyword) {
    return true;
  }

  const normalized = keyword.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

function applyPendingQuery(items: Awaited<ReturnType<typeof getDashboardData>>["pending"], query: string) {
  return items.filter((item) =>
    includesKeyword([item.displayName, item.slug, item.authorName, item.summary, item.category], query),
  );
}

function applyUserQuery(items: Awaited<ReturnType<typeof getDashboardData>>["users"], query: string) {
  return items.filter((item) => includesKeyword([item.username, item.displayName], query));
}

function applySkillQuery(items: Awaited<ReturnType<typeof getDashboardData>>["allSkills"], query: string) {
  return items.filter((item) =>
    includesKeyword([item.displayName, item.slug, item.category, item.summary, ...item.tags], query),
  );
}

function groupManagedSkills(items: Awaited<ReturnType<typeof getDashboardData>>["allSkills"]) {
  const groups = new Map<string, Awaited<ReturnType<typeof getDashboardData>>["allSkills"]>();

  for (const item of items) {
    const existing = groups.get(item.slug) ?? [];
    existing.push(item);
    groups.set(item.slug, existing);
  }

  return [...groups.values()]
    .map((versions) => {
      const sortedVersions = [...versions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      const latest = sortedVersions[0];

      return {
        id: latest.id,
        slug: latest.slug,
        displayName: latest.displayName,
        summary: latest.summary,
        category: latest.category,
        status: latest.status,
        updatedAt: latest.updatedAt,
        latestVersion: latest.version,
        versionCount: sortedVersions.length,
        totalDownloads: sortedVersions.reduce((sum, version) => sum + version.downloads, 0),
        publishedCount: sortedVersions.filter((version) => version.status === "published").length,
        pendingCount: sortedVersions.filter((version) => version.status === "pending").length,
        rejectedCount: sortedVersions.filter((version) => version.status === "rejected").length,
        versions: sortedVersions,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function applyLogQuery(items: Awaited<ReturnType<typeof getDashboardData>>["logs"], query: string) {
  return items.filter((item) =>
    includesKeyword([item.actorName, item.targetLabel, item.message, item.action], query),
  );
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

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
  );
}
