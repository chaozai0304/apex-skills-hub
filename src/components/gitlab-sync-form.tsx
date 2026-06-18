"use client";

import { useMemo, useState } from "react";

import type { GitLabBranchOption, GitLabSyncConfigSummary, UserRecord } from "@/lib/types";

const SUPER_ADMIN_PROJECT_ADMIN_ID = "__superadmin__";

type GitLabSyncFormProps = {
  summary: GitLabSyncConfigSummary;
  users?: UserRecord[];
  compact?: boolean;
};

export function GitLabSyncForm({ summary, users = [], compact = false }: GitLabSyncFormProps) {
  const [projectName, setProjectName] = useState(summary.name ?? "");
  const [repositoryTreeUrl, setRepositoryTreeUrl] = useState(summary.repositoryTreeUrl);
  const [branch, setBranch] = useState(summary.branch);
  const [token, setToken] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [selectedAdminIds, setSelectedAdminIds] = useState(() => new Set(summary.adminUserIds ?? []));
  const [branches, setBranches] = useState<GitLabBranchOption[]>(summary.availableBranches ?? []);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const adminCandidates = useMemo(() => [
    {
      id: SUPER_ADMIN_PROJECT_ADMIN_ID,
      username: "superadmin",
      email: "superadmin",
      displayName: "超级管理员",
    },
    ...users,
  ], [users]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, GitLabBranchOption>();
    for (const item of branches) {
      map.set(item.name, item);
    }
    if (branch && !map.has(branch)) {
      map.set(branch, { name: branch });
    }
    return [...map.values()];
  }, [branch, branches]);

  const filteredUsers = useMemo(() => {
    const keyword = adminSearch.trim().toLowerCase();
    if (!keyword) {
      return adminCandidates;
    }

    return adminCandidates.filter((user) =>
      [user.displayName, user.username, user.email].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [adminCandidates, adminSearch]);

  function toggleAdmin(userId: string) {
    setSelectedAdminIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleLoadBranches() {
    setIsLoadingBranches(true);
    setBranchError(null);

    try {
      const response = await fetch("/api/admin/integrations/gitlab/branches", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: summary.id,
          repositoryTreeUrl,
          token,
        }),
      });

      const payload = (await response.json()) as {
        branches?: GitLabBranchOption[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "加载 GitLab 分支失败。");
      }

      const nextBranches = payload.branches ?? [];
      setBranches(nextBranches);

      if (!branch && nextBranches.length) {
        const preferred = nextBranches.find((item) => item.isDefault) ?? nextBranches[0];
        setBranch(preferred.name);
      }
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : "加载 GitLab 分支失败。");
    } finally {
      setIsLoadingBranches(false);
    }
  }

  return (
    <form action="/api/admin/integrations/gitlab" method="post" className={`${compact ? "mt-0 grid-cols-2 gap-2.5 text-xs" : "mt-6 gap-4"} grid`}>
      <input type="hidden" name="projectId" value={summary.id ?? "global"} />
      <label className="grid gap-1 text-xs text-slate-600">
        项目名称
        <input
          name="projectName"
          required
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="例如：AI 项目管理 / Skills Hub"
          className="field-input h-9"
        />
      </label>

      <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <input type="checkbox" name="enabled" defaultChecked={summary.enabled} className="h-3.5 w-3.5 rounded border-slate-300" />
        审批发布后自动同步到 GitLab
      </label>

      <label className="col-span-2 grid gap-1 text-xs text-slate-600">
        GitLab 目录地址
        <input
          name="repositoryTreeUrl"
          value={repositoryTreeUrl}
          onChange={(event) => setRepositoryTreeUrl(event.target.value)}
          placeholder="http://172.17.1.2/group/project/-/tree/master/.github/skills"
          className="field-input h-9"
        />
      </label>

      <div className="grid gap-1 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="gitlab-sync-branch">同步分支</label>
          <button
            type="button"
            onClick={handleLoadBranches}
            className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingBranches}
          >
            {isLoadingBranches ? "加载中..." : "加载分支列表"}
          </button>
        </div>
        <select
          id="gitlab-sync-branch"
          name="branch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          className="field-input h-9"
        >
          <option value="">请选择同步分支</option>
          {branchOptions.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}{item.isDefault ? "（默认）" : ""}
            </option>
          ))}
        </select>
        <span className="text-[11px] leading-4 text-slate-500">
          可加载仓库分支后选择目标分支。
        </span>
        {branchError ? <span className="text-[11px] text-rose-600">{branchError}</span> : null}
      </div>

      <label className="grid gap-1 text-xs text-slate-600">
        授权码 / Token
        <input
          name="token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={summary.hasToken ? "已保存，留空则保持不变" : "输入 GitLab Personal / Project Access Token"}
          className="field-input h-9"
        />
        <span className="text-[11px] leading-4 text-slate-500">
          {summary.maskedToken
            ? `当前已保存：${summary.maskedToken}（不会回显明文，留空则保持不变）`
            : "尚未保存 Token。输入后保存即可启用自动同步。"}
        </span>
      </label>

      <div className="col-span-2 grid gap-1 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <span>项目管理员</span>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">已选 {selectedAdminIds.size} 人</span>
        </div>
        {[...selectedAdminIds].map((userId) => (
          <input key={userId} type="hidden" name="adminUserIds" value={userId} />
        ))}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <input
            value={adminSearch}
            onChange={(event) => setAdminSearch(event.target.value)}
            placeholder="搜索用户姓名、用户名或邮箱"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-sky-300"
          />
          <div className="mt-2 grid max-h-32 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredUsers.map((user) => {
              const selected = selectedAdminIds.has(user.id);
              const isSuperAdmin = user.id === SUPER_ADMIN_PROJECT_ADMIN_ID;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleAdmin(user.id)}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${selected ? "bg-sky-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold">{user.displayName}</span>
                    <span className={`block truncate text-[10px] ${selected ? "text-sky-100" : "text-slate-400"}`}>{isSuperAdmin ? "内置超管账号" : user.email || user.username}</span>
                  </span>
                  <span className={`ml-2 h-4 w-4 rounded-full border ${selected ? "border-white bg-white text-sky-700" : "border-slate-300"}`}>{selected ? "✓" : ""}</span>
                </button>
              );
            })}
            {!filteredUsers.length ? <div className="col-span-2 px-2 py-3 text-center text-[11px] text-slate-400">没有匹配用户</div> : null}
          </div>
        </div>
        <span className="text-[11px] text-slate-500">项目管理员可审核该项目提交的 skills。</span>
      </div>

      <label className="col-span-2 grid gap-1 text-xs text-slate-600">
        项目审批人飞书接收人
        <input
          name="notifyEmails"
          defaultValue={(summary.notifyEmails ?? []).join(", ")}
          placeholder="owner@example.com, open_id:ou_xxx, user_id:xxx"
          className="field-input h-9"
        />
        <span className="text-[11px] text-slate-500">多个接收人用逗号分隔；支持 email、open_id:、user_id:、union_id:。技能提交时会给这些审批人发个人消息。</span>
      </label>

      <div className="col-span-2 flex flex-wrap gap-2 pt-1">
        <button type="submit" name="intent" value="save" className="button-primary h-8 px-3 text-[11px]">
          保存同步配置
        </button>
        <button type="submit" name="intent" value="test" className="button-secondary h-8 px-3 text-[11px]">
          测试同步
        </button>
        <button type="submit" name="intent" value="resetToken" className="inline-flex h-8 items-center justify-center rounded-full border border-rose-200 px-3 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50">
          重置 Token
        </button>
      </div>
    </form>
  );
}
