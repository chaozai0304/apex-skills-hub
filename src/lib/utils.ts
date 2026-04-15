import clsx from "clsx";

export function cn(...classes: Parameters<typeof clsx>) {
  return clsx(...classes);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return `${Math.floor(days / 30)} 个月前`;
  }

  if (days > 0) {
    return `${days} 天前`;
  }

  if (hours > 0) {
    return `${hours} 小时前`;
  }

  if (minutes > 0) {
    return `${minutes} 分钟前`;
  }

  return "刚刚";
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function splitTags(raw: string) {
  return raw
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
