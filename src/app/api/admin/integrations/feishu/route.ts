import { isAdminAuthenticated } from "@/lib/auth";
import { buildSeeOtherResponse } from "@/lib/site";
import { updateFeishuNotificationConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return buildSeeOtherResponse(request, "/admin/login?next=/admin?tab=feishu");
  }

  const formData = await request.formData();
  const enabled = String(formData.get("enabled") ?? "") === "on";
  const appId = String(formData.get("appId") ?? "");
  const appSecret = String(formData.get("appSecret") ?? "");
  const chatId = String(formData.get("chatId") ?? "");
  const clearSecret = String(formData.get("intent") ?? "") === "resetSecret";

  try {
    await updateFeishuNotificationConfig({ enabled: clearSecret ? false : enabled, appId, appSecret, chatId, clearSecret });
    return buildSeeOtherResponse(request, clearSecret ? "/admin?tab=feishu&syncTokenReset=1" : "/admin?tab=feishu&syncSaved=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存飞书通知配置失败。";
    return buildSeeOtherResponse(request, `/admin?tab=feishu&syncError=${encodeURIComponent(message)}`);
  }
}
