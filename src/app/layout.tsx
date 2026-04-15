import type { Metadata } from "next";

import { getCurrentLocale } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Skills Hub",
  description: "Enterprise-ready Skills Hub for publishing, reviewing, browsing, and installing skills with ClawHub Registry support. 企业级 Skills Hub 平台，支持在线上传、审核发布、详情展示与 ClawHub Registry 安装。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html
      lang={locale === "en" ? "en" : "zh-CN"}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}
