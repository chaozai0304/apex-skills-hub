"use client";

import { useState } from "react";

type SubmissionState = {
  type: "success" | "error";
  message: string;
};

type PublishFormProps = {
  initialSubmitted?: string;
  initialError?: string;
  initialSlug?: string;
  initialValues?: {
    displayName?: string;
    slug?: string;
    category?: string;
    summary?: string;
    tags?: string;
    authorName?: string;
    authorEmail?: string;
    changelog?: string;
  };
  versionHint?: string;
  mode?: "create" | "update";
};

export function PublishForm({
  initialSubmitted,
  initialError,
  initialSlug,
  initialValues,
  versionHint,
  mode = "create",
}: PublishFormProps) {
  const [state, setState] = useState<SubmissionState | null>(
    initialSubmitted
      ? {
          type: "success",
          message: `提交成功：${initialSlug} 已进入审批队列。`,
        }
      : initialError
        ? { type: "error", message: initialError }
        : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setState(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as
        | { ok: true; slug: string; message: string }
        | { ok: false; error: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "提交失败，请稍后重试。" : result.error);
      }

      form.reset();
      setState({ type: "success", message: result.message });
    } catch (error) {
      setState({
        type: "error",
        message: error instanceof Error ? error.message : "提交失败，请稍后重试。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {state?.type === "success" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      {state?.type === "error" ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {state.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-5">
        {mode === "update" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-800">
            当前为<strong className="mx-1 text-sky-900">更新已有技能</strong>模式：请保持 <code>slug</code> 不变，并提交一个新的 <code>version</code>。
            审批通过后，CLI 在未指定版本时会默认安装该技能的最新发布版本。
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-600">
            技能标题
            <input name="displayName" required defaultValue={initialValues?.displayName} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            slug
            <input name="slug" required defaultValue={initialValues?.slug} placeholder="feature-full-lifecycle" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-600">
            版本号
            <input name="version" required placeholder={versionHint || "v20260415.1"} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            分类
            <input name="category" defaultValue={initialValues?.category || "开发"} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-slate-600">
          摘要
          <textarea name="summary" rows={3} required defaultValue={initialValues?.summary} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-300 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm text-slate-600">
          更新说明
          <textarea name="changelog" rows={3} defaultValue={initialValues?.changelog} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-300 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm text-slate-600">
          标签（逗号分隔）
          <input name="tags" defaultValue={initialValues?.tags} placeholder="需求拆解, 发布管理, code-review" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-600">
            作者姓名
            <input name="authorName" required defaultValue={initialValues?.authorName} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            作者邮箱
            <input name="authorEmail" required type="email" defaultValue={initialValues?.authorEmail} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-300 focus:bg-white" />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-slate-600">
          上传 ZIP 包
          <input name="archive" type="file" accept=".zip" required className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm" />
        </label>

        <button type="submit" disabled={submitting} className="mt-2 h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "正在提交..." : "提交审批"}
        </button>
      </form>
    </>
  );
}
