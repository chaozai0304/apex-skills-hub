import Link from "next/link";

import type { CatalogItem } from "@/lib/types";
import { formatNumber, formatRelativeDate } from "@/lib/utils";

export function SkillCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      href={`/skills/${item.slug}`}
      className="group surface-card flex h-full flex-col p-6 transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_22px_60px_-26px_rgba(14,165,233,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {item.category}
            </span>
            {item.featured ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                推荐
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-sky-700">
            {item.displayName}
          </h3>
          <div className="mt-2 text-sm text-slate-500">{item.slug}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right text-xs text-slate-500">
          <div>版本</div>
          <div className="mt-1 font-semibold text-slate-900">{item.version}</div>
        </div>
      </div>

      <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">{item.summary}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500 md:grid-cols-4">
        <div>
          <div>下载量</div>
          <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.downloads)}</div>
        </div>
        <div>
          <div>当前安装</div>
          <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.installsCurrent)}</div>
        </div>
        <div>
          <div>文件数</div>
          <div className="mt-1 font-semibold text-slate-900">{item.fileCount}</div>
        </div>
        <div>
          <div>更新时间</div>
          <div className="mt-1 font-semibold text-slate-900">{formatRelativeDate(item.updatedAt)}</div>
        </div>
      </div>
    </Link>
  );
}
