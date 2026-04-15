"use client";

import { useState } from "react";

export function InstallCommand({
  command,
  note,
  variant = "dark",
}: {
  command: string;
  note?: string;
  variant?: "dark" | "light";
}) {
  const [copied, setCopied] = useState(false);
  const isLight = variant === "light";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={isLight
        ? "surface-card p-5"
        : "rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_80px_-32px_rgba(2,6,23,0.75)]"}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-xs font-semibold uppercase tracking-[0.3em] ${isLight ? "text-sky-700" : "text-sky-300"}`}>
            CLI Install Command
          </div>
          <div className={`mt-2 text-sm ${isLight ? "text-slate-500" : "text-slate-300"}`}>
            这是安装命令卡片，不是按钮；复制后可直接在终端执行。
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={isLight
            ? "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            : "rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-white/5"}
        >
          {copied ? "已复制" : "复制命令"}
        </button>
      </div>
      <pre
        className={isLight
          ? "mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 whitespace-pre-wrap break-all text-sm leading-7 text-slate-800"
          : "mt-3 overflow-x-auto whitespace-pre-wrap break-all text-sm leading-7 text-slate-100"}
      >
        {command}
      </pre>
      {note ? <p className={`mt-3 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>{note}</p> : null}
    </div>
  );
}
