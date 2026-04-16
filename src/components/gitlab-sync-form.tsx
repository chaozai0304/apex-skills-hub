"use client";

import { useMemo, useState } from "react";

import type { GitLabBranchOption, GitLabSyncConfigSummary } from "@/lib/types";

type GitLabSyncFormProps = {
  summary: GitLabSyncConfigSummary;
};

export function GitLabSyncForm({ summary }: GitLabSyncFormProps) {
  const [repositoryTreeUrl, setRepositoryTreeUrl] = useState(summary.repositoryTreeUrl);
  const [branch, setBranch] = useState(summary.branch);
  const [token, setToken] = useState("");
  const [branches, setBranches] = useState<GitLabBranchOption[]>(summary.availableBranches ?? []);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

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
    <form action="/api/admin/integrations/gitlab" method="post" className="mt-6 grid gap-4">
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input type="checkbox" name="enabled" defaultChecked={summary.enabled} className="h-4 w-4 rounded border-slate-300" />
        审批发布后自动同步到 GitLab
      </label>

      <label className="grid gap-2 text-sm text-slate-600">
        GitLab 目录地址
        <input
          name="repositoryTreeUrl"
          value={repositoryTreeUrl}
          onChange={(event) => setRepositoryTreeUrl(event.target.value)}
          placeholder="http://172.17.1.2/group/project/-/tree/master/.github/skills"
          className="field-input"
        />
      </label>

      <div className="grid gap-2 text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="gitlab-sync-branch">同步分支</label>
          <button
            type="button"
            onClick={handleLoadBranches}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="field-input"
        >
          <option value="">请选择同步分支</option>
          {branchOptions.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}{item.isDefault ? "（默认）" : ""}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          目录地址里的 branch 会作为默认值；你可以加载仓库分支列表后改成任意目标分支。
        </span>
        {branchError ? <span className="text-xs text-rose-600">{branchError}</span> : null}
      </div>

      <label className="grid gap-2 text-sm text-slate-600">
        授权码 / Token
        <input
          name="token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={summary.hasToken ? "已保存，留空则保持不变" : "输入 GitLab Personal / Project Access Token"}
          className="field-input"
        />
        <span className="text-xs text-slate-500">
          {summary.maskedToken
            ? `当前已保存：${summary.maskedToken}（不会回显明文，留空则保持不变）`
            : "尚未保存 Token。输入后保存即可启用自动同步。"}
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="save" className="button-primary h-12 px-6 text-sm">
          保存同步配置
        </button>
        <button type="submit" name="intent" value="test" className="button-secondary h-12 px-6 text-sm">
          测试同步
        </button>
        <button type="submit" name="intent" value="resetToken" className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-200 px-6 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
          重置 Token
        </button>
      </div>
    </form>
  );
}
