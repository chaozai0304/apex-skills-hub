"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Power, Trash2 } from "lucide-react";

import { GitLabSyncForm } from "@/components/gitlab-sync-form";
import type { GitLabSyncConfigSummary, UserRecord } from "@/lib/types";

type GitLabProjectsTableProps = {
  summary: GitLabSyncConfigSummary;
  users: UserRecord[];
};

const NEW_PROJECT: GitLabSyncConfigSummary = {
  id: "new-project",
  name: "",
  enabled: false,
  repositoryTreeUrl: "",
  branch: "",
  hasToken: false,
  adminUserIds: [],
  notifyEmails: [],
};

export function GitLabProjectsTable({ summary, users }: GitLabProjectsTableProps) {
  const projects = useMemo(() => summary.projects?.length ? summary.projects : [summary], [summary]);
  const [editing, setEditing] = useState<GitLabSyncConfigSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "global");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = projects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? summary,
    [projects, selectedProjectId, summary],
  );

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">共 {projects.length} 个项目，点击行查看状态</div>
          <button type="button" onClick={() => setEditing({ ...NEW_PROJECT })} className="button-primary h-8 gap-1.5 px-3 text-[11px]">
            <Plus className="h-3 w-3" />
            新增项目
          </button>
        </div>

        <div className="compact-table overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full divide-y divide-slate-200 text-left">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[24%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th>项目名称</th>
                <th>状态</th>
                <th>GitLab 项目</th>
                <th>分支</th>
                <th>目录</th>
                <th>管理员</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {pagedProjects.map((project) => {
                const isSelected = selectedProject.id === project.id;
                return (
                  <tr
                    key={project.id ?? project.name}
                    onClick={() => setSelectedProjectId(project.id ?? "global")}
                    className={`cursor-pointer transition ${isSelected ? "bg-sky-50/80 ring-1 ring-inset ring-sky-100" : "hover:bg-slate-50/70"}`}
                  >
                    <td className="font-semibold text-slate-950">{project.name || "未命名项目"}</td>
                    <td>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${project.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {project.enabled ? "启用" : "停用"}
                        </span>
                        <form action="/api/admin/integrations/gitlab" method="post" onClick={(event) => event.stopPropagation()}>
                          <input type="hidden" name="intent" value="save" />
                          <input type="hidden" name="projectId" value={project.id ?? "global"} />
                          <input type="hidden" name="projectName" value={project.name ?? ""} />
                          <input type="hidden" name="repositoryTreeUrl" value={project.repositoryTreeUrl ?? ""} />
                          <input type="hidden" name="branch" value={project.branch ?? ""} />
                          {project.adminUserIds?.map((userId) => (
                            <input key={userId} type="hidden" name="adminUserIds" value={userId} />
                          ))}
                          {project.notifyEmails?.map((email) => (
                            <input key={email} type="hidden" name="notifyEmails" value={email} />
                          ))}
                          {!project.enabled ? <input type="hidden" name="enabled" value="on" /> : null}
                          <button type="submit" data-loading-message="正在切换同步状态..." className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-semibold shadow-sm transition ${project.enabled ? "border border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"}`}>
                            <Power className="h-2.5 w-2.5" />
                            {project.enabled ? "停用" : "启用"}
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="text-slate-700" title={project.projectPath || project.repositoryTreeUrl}>{project.projectPath || "未配置"}</td>
                    <td>{project.branch || "-"}</td>
                    <td title={project.basePath || "/"}>{project.basePath || "/"}</td>
                    <td>{project.adminUserIds?.length ?? 0} 人</td>
                    <td>
                      <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setEditing(project)} className="inline-flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-sky-100 bg-sky-50 px-2 text-[10px] font-semibold text-sky-700 transition hover:bg-sky-100">
                          <PencilLine className="h-3 w-3" />
                          修改
                        </button>
                        <form action="/api/admin/integrations/gitlab" method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="projectId" value={project.id ?? "global"} />
                          <button type="submit" data-loading-message="正在删除同步项目..." className="inline-flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-rose-100 bg-rose-50 px-2 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100">
                            <Trash2 className="h-3 w-3" />
                            删除
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-slate-500">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="button-secondary h-7 px-2 disabled:opacity-40">上一页</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="button-secondary h-7 px-2 disabled:opacity-40">下一页</button>
          </div>
        ) : null}
      </div>

      <SelectedProjectStatus project={selectedProject} />

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4 border-b border-slate-100 pb-2.5">
              <div>
                <div className="section-eyebrow">Project Sync</div>
                <h3 className="mt-0.5 text-base font-semibold text-slate-950">{editing.id?.startsWith("new-project") ? "新增同步项目" : "修改同步项目"}</h3>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="button-secondary h-7 px-3 text-[11px]">关闭</button>
            </div>
            <GitLabSyncForm key={editing.id ?? editing.name ?? "new-project"} summary={editing} users={users} compact />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectedProjectStatus({ project }: { project: GitLabSyncConfigSummary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">当前状态</h3>
          <p className="mt-1 text-[11px] text-slate-500">{project.name || "未命名项目"}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${project.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {project.enabled ? "已启用" : "未启用"}
        </span>
      </div>

      <div className="mt-2 space-y-1.5 text-[11px] text-slate-600">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white px-3 py-2">
          <span>Token</span>
          <div className="flex items-center gap-2">
            {project.maskedToken ? <span className="text-[11px] text-slate-500">{project.maskedToken}</span> : null}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${project.hasToken ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {project.hasToken ? "已保存" : "未配置"}
            </span>
          </div>
        </div>
        <StatusItem label="Project" value={project.projectPath || "尚未解析"} />
        <StatusItem label="Branch" value={project.branch || "尚未解析"} />
        <StatusItem label="Base Path" value={project.basePath || "/"} />
        <StatusItem label="最近更新" value={formatProjectUpdatedAt(project.updatedAt)} />
        <StatusItem label="Storage" value={project.storageReady === false ? "等待数据库迁移" : "配置表可用"} />
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 break-all font-medium text-slate-900">{value}</div>
    </div>
  );
}

function formatProjectUpdatedAt(value?: string) {
  if (!value) {
    return "尚未保存配置";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
