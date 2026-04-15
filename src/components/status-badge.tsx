import type { SubmissionStatus } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const styleMap: Record<SubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  published: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-100 text-rose-700 ring-rose-200",
};

export function StatusBadge({ status, locale = "zh" }: { status: SubmissionStatus; locale?: Locale }) {
  const labelMap: Record<SubmissionStatus, string> = {
    pending: locale === "en" ? "Pending" : "待审批",
    published: locale === "en" ? "Published" : "已发布",
    rejected: locale === "en" ? "Rejected" : "已驳回",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        styleMap[status],
      )}
    >
      {labelMap[status]}
    </span>
  );
}
