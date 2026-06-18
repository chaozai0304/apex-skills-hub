import type { FeishuNotificationConfig } from "@/lib/types";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

type TenantTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
};

type MessageResponse = {
  code?: number;
  msg?: string;
};

export type FeishuReceiveIdType = "open_id" | "union_id" | "user_id" | "email" | "chat_id";

type FeishuMessageType = "text" | "interactive";

type FeishuInteractiveCard = Record<string, unknown>;

export async function sendFeishuTextMessage(input: {
  config: FeishuNotificationConfig;
  receiveIdType: FeishuReceiveIdType;
  receiveId: string;
  text: string;
}) {
  return sendFeishuMessage({
    config: input.config,
    receiveIdType: input.receiveIdType,
    receiveId: input.receiveId,
    msgType: "text",
    content: { text: input.text },
  });
}

export async function sendFeishuCardMessage(input: {
  config: FeishuNotificationConfig;
  receiveIdType: FeishuReceiveIdType;
  receiveId: string;
  card: FeishuInteractiveCard;
}) {
  return sendFeishuMessage({
    config: input.config,
    receiveIdType: input.receiveIdType,
    receiveId: input.receiveId,
    msgType: "interactive",
    content: input.card,
  });
}

async function sendFeishuMessage(input: {
  config: FeishuNotificationConfig;
  receiveIdType: FeishuReceiveIdType;
  receiveId: string;
  msgType: FeishuMessageType;
  content: Record<string, unknown>;
}) {
  if (!input.config.enabled || !input.config.appId || !input.config.appSecret || !input.receiveId.trim()) {
    return { sent: false, message: "飞书通知未配置完整。" };
  }

  const token = await getTenantAccessToken(input.config);
  const response = await fetch(`${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${input.receiveIdType}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      receive_id: input.receiveId.trim(),
      msg_type: input.msgType,
      content: JSON.stringify(input.content),
    }),
  });
  const payload = await response.json().catch(() => ({})) as MessageResponse;

  if (!response.ok || payload.code) {
    throw new Error(payload.msg || "发送飞书消息失败。");
  }

  return { sent: true, message: "飞书消息已发送。" };
}

async function getTenantAccessToken(config: FeishuNotificationConfig) {
  const response = await fetch(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  });
  const payload = await response.json().catch(() => ({})) as TenantTokenResponse;

  if (!response.ok || payload.code || !payload.tenant_access_token) {
    throw new Error(payload.msg || "获取飞书 tenant_access_token 失败。");
  }

  return payload.tenant_access_token;
}
