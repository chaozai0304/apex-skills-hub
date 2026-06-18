import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarClock, Download, Eye, Files, Layers3, Tag } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { FileTree } from "@/components/file-tree";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { canManageSubmissionProject, getProjectAdminScope, getSubmissionById } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReviewSubmissionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backTo?: string }>;
};

export default async function ReviewSubmissionPage({ params, searchParams }: ReviewSubmissionPageProps) {
  const { id } = await params;
  const { backTo } = await searchParams;

  const isAdmin = await isAdminAuthenticated();
  const currentUser = isAdmin ? null : await getCurrentUser();
  const projectScope = isAdmin ? [] : await getProjectAdminScope(currentUser?.id);

  if (!isAdmin && !projectScope.length) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/submissions/${id}`)}`);
  }

  if (!isAdmin && !(await canManageSubmissionProject(id, projectScope))) {
    redirect("/admin?skillError=你没有权限查看这个待审批技能。&tab=pending");
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    redirect("/admin?skillError=未找到对应的技能提交。&tab=pending");
  }

  const safeBackTo = normalizeBackTo(backTo);
  const publicDetailHref = submission.status === "published" ? `/skills/${submission.slug}` : null;

  return (
    <AppShell>
      <section className="section-card lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            <Eye className="h-3.5 w-3.5" />
            审批预览
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            {submission.projectName}
          </span>
          <StatusBadge status={submission.status} />
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
          {submission.displayName}
        </h1>
        <div className="mt-3 text-xs text-slate-500">
          作者 {submission.authorName} · slug {submission.slug} · 版本 {submission.version}
        </div>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{submission.summary}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "版本", value: submission.version, icon: Layers3 },
            { label: "文件数", value: String(submission.fileCount), icon: Files },
            { label: "状态", value: submission.status === "pending" ? "待审批" : submission.status === "published" ? "已发布" : "已驳回", icon: Eye },
            { label: "提交时间", value: formatDateTime(submission.createdAt), icon: CalendarClock },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
              <div className="mt-1.5 text-base font-semibold text-slate-950">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`/api/admin/submissions/${submission.id}/download`} className="button-primary h-10 gap-2 px-4 text-xs">
            <Download className="h-4 w-4" />
            下载上传 ZIP
          </a>
          {publicDetailHref ? (
            <Link href={publicDetailHref} className="button-secondary h-10 px-4 text-xs">
              查看公开详情页
            </Link>
          ) : null}
          <Link href={safeBackTo} className="button-secondary h-10 px-4 text-xs">
            返回审批列表
          </Link>
        </div>

        {submission.reviewNotes ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="font-semibold">当前审核备注</div>
            <div className="mt-1 whitespace-pre-line">{submission.reviewNotes}</div>
          </div>
        ) : null}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
            <div className="section-eyebrow">SKILL.md</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">技能内容预览</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">
              这里直接展示上传 ZIP 中解析出的主说明文档，方便审批前核对真实内容，而不是只看标题和摘要。
            </p>
          </div>
          <div className="px-5 py-5 lg:px-6 lg:py-6">
            <div className="rounded-2xl bg-slate-50 px-5 py-5 text-sm text-slate-700">
              <MarkdownRenderer content={submission.readme} />
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="section-eyebrow">文件结构</div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">压缩包目录</h2>
            </div>
            <div className="px-4 py-4">
              <FileTree nodes={submission.fileTree} />
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="section-eyebrow">元信息</div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">审核辅助信息</h2>
            </div>

            <dl className="divide-y divide-slate-100">
              {[
                { label: "项目", value: submission.projectName },
                { label: "分类", value: submission.category },
                { label: "提交时间", value: formatDateTime(submission.createdAt) },
                { label: "更新时间", value: formatDateTime(submission.updatedAt) },
                { label: "作者邮箱", value: submission.authorEmail || "-" },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <dt className="text-xs text-slate-500">{item.label}</dt>
                  <dd className="text-right text-xs font-semibold text-slate-950">{item.value}</dd>
                </div>
              ))}
            </dl>

            {submission.tags.length ? (
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Tag className="h-3.5 w-3.5" />
                  标签
                </div>
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function normalizeBackTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin?tab=pending";
  }

  return value;
}
