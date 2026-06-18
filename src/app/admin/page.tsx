import { Activity, Download, Eye, RefreshCw, ShieldCheck, Trash2, UserRoundCog, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { FeishuConfigForm } from "@/components/feishu-config-form";
import { GitLabProjectsTable } from "@/components/gitlab-projects-table";
import { StatusBadge } from "@/components/status-badge";
import { UserEditButton, UserManagementActions } from "@/components/user-management-actions";
import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { getDashboardData, getFeishuNotificationSummary, getGitLabSyncConfigSummary, getProjectAdminScope, listProjectOptions } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ADMIN_TABS = [
  { key: "pending", label: "待审批", icon: ShieldCheck },
  { key: "users", label: "用户管理", icon: UserRoundCog },
  { key: "skills", label: "技能列表", icon: Trash2 },
  { key: "logs", label: "审批日志", icon: Activity },
  { key: "sync", label: "项目配置", icon: RefreshCw },
  { key: "feishu", label: "飞书配置", icon: Activity },
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
    skillUpdated?: string;
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
    project?: string;
    page?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const isAdmin = await isAdminAuthenticated();
  const currentUser = isAdmin ? null : await getCurrentUser();
  const projectScope = isAdmin ? [] : await getProjectAdminScope(currentUser?.id);
  if (!isAdmin && !projectScope.length) {
    redirect("/admin/login?next=/admin");
  }

  const resolvedSearchParams = await searchParams;
  const [projects, { pending, recentPublished, users, logs, allSkills }, gitLabSync, feishuSync] = await Promise.all([
    listProjectOptions(),
    getDashboardData(isAdmin ? undefined : { projectIds: projectScope }),
    getGitLabSyncConfigSummary(),
    getFeishuNotificationSummary(),
  ]);
  const requestedTab = isAdminTabKey(resolvedSearchParams.tab) ? resolvedSearchParams.tab : "pending";
  const activeTab = !isAdmin && (requestedTab === "users" || requestedTab === "logs" || requestedTab === "sync" || requestedTab === "feishu") ? "pending" : requestedTab;
  const query = resolvedSearchParams.q?.trim() ?? "";
  const accessibleProjects = isAdmin ? projects : projects.filter((project) => projectScope.includes(project.id));
  const selectedProject = accessibleProjects.some((project) => project.id === resolvedSearchParams.project)
    ? resolvedSearchParams.project
    : "";
  const page = normalizePage(resolvedSearchParams.page);

  const projectFilteredPending = selectedProject ? pending.filter((item) => item.projectId === selectedProject) : pending;
  const projectFilteredSkills = selectedProject ? allSkills.filter((item) => item.projectId === selectedProject) : allSkills;
  const pendingItems = applyPendingQuery(projectFilteredPending, query);
  const userItems = applyUserQuery(users, query);
  const allSkillGroups = groupManagedSkills(projectFilteredSkills);
  const matchedSkillSlugs = new Set(applySkillQuery(projectFilteredSkills, query).map((item) => item.slug));
  const skillItems = groupManagedSkills(
    query ? projectFilteredSkills.filter((item) => matchedSkillSlugs.has(item.slug)) : projectFilteredSkills,
  );
  const logItems = applyLogQuery(logs, query);

  const currentItemsCountByTab: Record<AdminTabKey, number> = {
    pending: pendingItems.length,
    users: userItems.length,
    skills: skillItems.length,
    logs: logItems.length,
    sync: gitLabSync.projects?.length ?? 1,
    feishu: feishuSync.enabled ? 1 : 0,
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
            : activeTab === "sync"
              ? "项目配置"
              : "飞书配置";
  const activeDescription =
    activeTab === "pending"
      ? "集中处理待审批技能，支持按标题、slug、作者进行搜索并分页查看。"
      : activeTab === "users"
        ? "集中查看普通用户状态，支持搜索、分页和行级启停操作。"
        : activeTab === "skills"
          ? "按 slug 合并维护技能，支持查看多个版本，并可在删除时选择是否同步清理 GitLab 镜像目录。"
          : activeTab === "logs"
            ? "按时间倒序查看关键操作日志。"
            : activeTab === "sync"
              ? "维护项目 GitLab 目标和负责人。"
              : "配置飞书 App 与消息发送目标。";
  const currentAdminHref = buildAdminHref(activeTab, query, activePagination.page, selectedProject);

  return (
    <AppShell>
      <section className="section-card compact-table flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-eyebrow">Review Console</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">超级管理员审批控制台</h1>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        {[
          { label: "待审批", value: String(pending.length), icon: ShieldCheck },
          { label: "已建用户", value: String(users.length), icon: Users },
          { label: "可管理技能", value: String(allSkillGroups.length), icon: Trash2 },
          { label: "最近日志", value: String(logs.length), icon: Activity },
        ].map((item) => (
          <div key={item.label} className="surface-card p-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-500">{item.label}</div>
              <item.icon className="h-4 w-4 text-sky-700" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
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

      {resolvedSearchParams.skillUpdated ? (
        <div className="whitespace-pre-line rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {resolvedSearchParams.skillUpdated}
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

      <section className="section-card compact-table">
        <div className="flex flex-wrap gap-2">
          {ADMIN_TABS.filter((tab) => isAdmin || (tab.key !== "users" && tab.key !== "logs" && tab.key !== "sync" && tab.key !== "feishu")).map((tab) => {
            const href = buildAdminHref(tab.key, query, 1, selectedProject);
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-950 !text-white shadow-[0_14px_35px_-20px_rgba(15,23,42,0.6)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <tab.icon className="h-3.5 w-3.5" />
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
                          : tab.key === "sync"
                            ? gitLabSync.projects?.length ?? 1
                            : feishuSync.enabled ? 1 : 0}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">{activeTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{activeDescription}</p>
          </div>

          {activeTab !== "sync" && activeTab !== "feishu" ? (
            <form className="flex w-full max-w-2xl flex-col gap-2 md:flex-row" action="/admin" method="get">
              <input type="hidden" name="tab" value={activeTab} />
              <select name="project" defaultValue={selectedProject} className="field-input h-9 md:w-48">
                <option value="">全部项目</option>
                {accessibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder={getSearchPlaceholder(activeTab)}
                className="field-input h-9 flex-1"
              />
              <button type="submit" className="button-primary h-9 px-4 text-xs">
                搜索
              </button>
            </form>
          ) : null}
        </div>

        {activeTab === "users" ? (
          <UserManagementActions />
        ) : null}

        {activeTab === "sync" ? (
          <div className="mt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <h3 className="text-sm font-semibold text-slate-950">GitLab 项目参数</h3>

              {gitLabSync.issue ? (
                <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${gitLabSync.storageReady === false ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {gitLabSync.issue}
                </div>
              ) : null}

              <GitLabProjectsTable summary={gitLabSync} users={users} />
            </div>
          </div>
        ) : activeTab === "feishu" ? (
          <div className="mt-4">
            <FeishuConfigForm summary={feishuSync} />
          </div>
        ) : (
          <div className="compact-table mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {activeTab === "pending" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[18%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">技能</th>
                  <th className="px-4 py-3">作者</th>
                  <th className="px-4 py-3">项目</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">提交时间</th>
                  <th className="px-4 py-3">审核备注</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedPending.items.length ? (
                  paginatedPending.items.map((item) => (
                    <tr key={item.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          href={buildSubmissionPreviewHref(item.id, currentAdminHref)}
                          className="inline-flex items-center gap-1.5 font-semibold text-slate-950 transition hover:text-sky-700"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.displayName}</span>
                        </Link>
                        <div className="mt-1 text-[11px] text-slate-500">{item.slug} · {item.version}</div>
                        <p className="mt-1 line-clamp-2 max-w-md text-[11px] leading-5 text-slate-500">{item.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={buildSubmissionPreviewHref(item.id, currentAdminHref)}
                            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            查看内容
                          </Link>
                          <a
                            href={`/api/admin/submissions/${item.id}/download`}
                            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            下载 ZIP
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{item.authorName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">{item.projectName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                        <div className="mt-1 text-[11px] text-slate-500">{item.category}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <textarea
                          form={`review-${item.id}`}
                          name="reviewNotes"
                          rows={2}
                          defaultValue={item.reviewNotes}
                          placeholder="请填写审批意见"
                          className="h-16 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-sky-300 focus:bg-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <form id={`review-${item.id}`} action={`/api/admin/review/${item.id}`} method="post" className="grid gap-2" data-loading-message="正在提交审批结果...">
                          <div className="grid gap-2">
                            <button name="decision" value="approve" data-loading-message="正在审批发布..." className="inline-flex h-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-teal-500">
                              审批发布
                            </button>
                            <button name="decision" value="reject" data-loading-message="正在驳回提交..." className="inline-flex h-8 items-center justify-center rounded-full border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              驳回退回
                            </button>
                          </div>
                        </form>
                        <form action={`/api/admin/skills/${item.id}/delete`} method="post" className="mt-2" data-loading-message="正在删除待审批技能...">
                          <input type="hidden" name="deleteScope" value="single" />
                          <input type="hidden" name="redirectTo" value={currentAdminHref} />
                          <button type="submit" className="inline-flex h-8 w-full items-center justify-center rounded-full border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                            删除提交
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={7} text={query ? "没有匹配的待审批技能。" : "当前没有待审批记录。"} />
                )}
              </tbody>
            </table>
          ) : null}

          {activeTab === "users" ? (
            <div>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">勾选用户后可批量删除</span>
              <form id="bulk-delete-users" action="/api/admin/users" method="post" data-loading-message="正在批量删除用户...">
                <input type="hidden" name="intent" value="deleteMany" />
                <button className="inline-flex h-7 items-center rounded-full border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100">批量删除</button>
              </form>
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">选择</th>
                  <th className="px-4 py-3">用户名</th>
                  <th className="px-4 py-3">邮箱</th>
                  <th className="px-4 py-3">显示名称</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">组织</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {paginatedUsers.items.length ? (
                  paginatedUsers.items.map((user) => (
                    <tr key={user.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-4 py-3"><input form="bulk-delete-users" type="checkbox" name="userIds" value={user.id} className="h-4 w-4 rounded border-slate-300" /></td>
                      <td className="px-4 py-4 font-medium text-slate-900">{user.username}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{user.email || "-"}</td>
                      <td className="px-4 py-4">{user.displayName}</td>
                      <td className="px-4 py-4">{user.roleLabel || "成员"}</td>
                      <td className="px-4 py-4">{user.organization || "-"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {user.disabled ? "已停用" : "正常可用"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                        <form action="/api/admin/users" method="post" data-loading-message="正在切换用户状态...">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="disabled" value={user.disabled ? "false" : "true"} />
                          <button type="submit" className={`${user.disabled ? "button-primary" : "button-secondary"} h-7 px-2.5 text-[11px] whitespace-nowrap`}>
                            {user.disabled ? "重新启用" : "停用账户"}
                          </button>
                        </form>
                        <UserEditButton user={user} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={9} text={query ? "没有匹配的用户记录。" : "当前没有用户记录。"} />
                )}
              </tbody>
            </table>
            </div>
          ) : null}

          {activeTab === "skills" ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">技能</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">项目</th>
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
                        <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{item.summary}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                        <div className="mt-2 text-xs text-slate-500">
                          已发布 {item.publishedCount} · 待审批 {item.pendingCount} · 已驳回 {item.rejectedCount}
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-[12rem]">
                        <div className="mb-2 rounded-full bg-sky-50 px-2.5 py-1 text-center text-xs font-semibold text-sky-700">{item.projectName}</div>
                        <form action={`/api/admin/skills/${item.id}/project`} method="post" className="grid gap-1.5">
                          <input type="hidden" name="redirectTo" value={currentAdminHref} />
                          <select name="projectId" defaultValue={item.projectId} className="field-input h-10 text-xs">
                            {accessibleProjects.map((project) => (
                              <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                          </select>
                          <button type="submit" className="button-secondary h-9 px-3 text-xs">切换项目并同步</button>
                        </form>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500">{formatDateTime(item.updatedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.totalDownloads}</td>
                      <td className="px-4 py-4 min-w-[16rem]">
                        <details className="mb-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700">
                            查看版本详情
                          </summary>
                          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                            {item.versions.map((version) => (
                              <div key={version.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-slate-900">{version.version}</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                      {formatDateTime(version.updatedAt)} · 文件 {version.fileCount} · 下载 {version.downloads}
                                    </div>
                                  </div>
                                  <StatusBadge status={version.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                        <form action={`/api/admin/skills/${item.id}/delete`} method="post" className="grid gap-2">
                          <input type="hidden" name="redirectTo" value={currentAdminHref} />
                          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-4 text-slate-600">
                            <input type="checkbox" name="deleteFromGitLab" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                            <span>同步删除 GitLab 镜像</span>
                          </label>
                          <button type="submit" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500">
                            <Trash2 className="h-3.5 w-3.5" />
                            删除整组技能
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={7} text={query ? "没有匹配的技能记录。" : "当前没有技能记录。"} />
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
                href={buildAdminHref(activeTab, query, Math.max(1, activePagination.page - 1), selectedProject)}
                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold ${activePagination.page === 1 ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "button-secondary"}`}
                aria-disabled={activePagination.page === 1}
              >
                上一页
              </Link>
              {Array.from({ length: activePagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildAdminHref(activeTab, query, pageNumber, selectedProject)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-semibold ${pageNumber === activePagination.page ? "bg-slate-950 !text-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.7)]" : "button-secondary"}`}
                  aria-current={pageNumber === activePagination.page ? "page" : undefined}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={buildAdminHref(activeTab, query, Math.min(activePagination.totalPages, activePagination.page + 1), selectedProject)}
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

function buildAdminHref(tab: AdminTabKey, q: string, page: number, project?: string) {
  const params = new URLSearchParams({ tab, page: String(page) });
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (project?.trim()) {
    params.set("project", project.trim());
  }
  return `/admin?${params.toString()}`;
}

function buildSubmissionPreviewHref(submissionId: string, backTo: string) {
  const params = new URLSearchParams({ backTo });
  return `/admin/submissions/${submissionId}?${params.toString()}`;
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
      return "项目配置不需要搜索";
    case "feishu":
      return "飞书配置不需要搜索";
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
        projectId: latest.projectId,
        projectName: latest.projectName,
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
