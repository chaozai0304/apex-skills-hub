import type { SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styleMap: Record<SubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  published: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-100 text-rose-700 ring-rose-200",
};

const labelMap: Record<SubmissionStatus, string> = {
  pending: "待审批",
  published: "已发布",
  rejected: "已驳回",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
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
