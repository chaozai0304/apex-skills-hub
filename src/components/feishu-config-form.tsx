import type { FeishuNotificationSummary } from "@/lib/types";

type FeishuConfigFormProps = {
  summary: FeishuNotificationSummary;
};

export function FeishuConfigForm({ summary }: FeishuConfigFormProps) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">飞书消息通知</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            配置 App ID / Secret 后即可发送个人消息；不需要配置群 Chat ID。提交发项目审批人，审批/驳回发发布人。
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${summary.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {summary.enabled ? "已启用" : "未启用"}
        </span>
      </div>

      {summary.issue ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {summary.issue}
        </div>
      ) : null}

      <form action="/api/admin/integrations/feishu" method="post" className="mt-3 grid gap-2.5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" data-loading-message="正在保存飞书通知配置...">
        <label className="grid gap-1 text-xs text-slate-600">
          App ID
          <input name="appId" required defaultValue={summary.appId} placeholder="cli_xxx" className="field-input h-9" />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          App Secret
          <input name="appSecret" type="password" required={!summary.hasAppSecret} placeholder={summary.hasAppSecret ? `已保存：${summary.maskedAppSecret}` : "app_secret"} className="field-input h-9" />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          群 Chat ID（可选，仅群通知）
          <input name="chatId" defaultValue={summary.chatId} placeholder="oc_xxx" className="field-input h-9" />
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
            <input type="checkbox" name="enabled" defaultChecked={summary.enabled} className="h-3.5 w-3.5 rounded border-slate-300" />
            启用
          </label>
          <button type="submit" className="button-primary h-9 px-4 text-xs">保存</button>
          <button type="submit" name="intent" value="resetSecret" className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
            重置 Secret
          </button>
        </div>
      </form>
    </div>
  );
}
