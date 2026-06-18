import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import type { CatalogItem } from "@/lib/types";
import { formatNumber, formatRelativeDate } from "@/lib/utils";

export function SkillCard({ item, locale = "zh" }: { item: CatalogItem; locale?: Locale }) {
  return (
    <Link
      href={`/skills/${item.slug}`}
      className="group surface-card flex h-full flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_45px_-28px_rgba(14,165,233,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
              {item.category}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {item.projectName}
            </span>
            {item.featured ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                {pick(locale, "推荐", "Featured")}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 group-hover:text-sky-700">
            {item.displayName}
          </h3>
          <div className="mt-1 text-xs text-slate-500">{item.slug}</div>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-right text-[11px] text-slate-500">
          <div>{pick(locale, "版本", "Version")}</div>
          <div className="mt-1 font-semibold text-slate-900">{item.version}</div>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-6 text-slate-600">{item.summary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 md:grid-cols-4">
        <div>
          <div>{pick(locale, "下载量", "Downloads")}</div>
          <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.downloads, locale)}</div>
        </div>
        <div>
          <div>{pick(locale, "当前安装", "Current installs")}</div>
          <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.installsCurrent, locale)}</div>
        </div>
        <div>
          <div>{pick(locale, "文件数", "Files")}</div>
          <div className="mt-1 font-semibold text-slate-900">{item.fileCount}</div>
        </div>
        <div>
          <div>{pick(locale, "更新时间", "Updated")}</div>
          <div className="mt-1 font-semibold text-slate-900">{formatRelativeDate(item.updatedAt, locale)}</div>
        </div>
      </div>
    </Link>
  );
}
