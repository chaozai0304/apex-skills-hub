import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, isAdmin, locale] = await Promise.all([
    getCurrentUser(),
    isAdminAuthenticated(),
    getCurrentLocale(),
  ]);
  const navItems = [
    { href: "/", label: pick(locale, "首页", "Home") },
    { href: "/publish", label: pick(locale, "发布", "Publish") },
    { href: "/search", label: pick(locale, "搜索", "Search") },
    { href: "/leaderboard", label: pick(locale, "排行榜", "Leaderboard") },
    ...(isAdmin ? [{ href: "/admin", label: pick(locale, "控制台", "Console") }] : []),
    ...(user ? [{ href: "/my-skills", label: pick(locale, "我的技能", "My Skills") }] : []),
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff,transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_45%,#f1f5f9_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/15">
              AH
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.2em] text-sky-700">
                APEX SKILLS HUB
              </div>
              <div className="text-xs text-slate-500">{pick(locale, "企业级 Skill Registry 平台", "Enterprise Skill Registry")}</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <nav className="flex items-center gap-8 text-sm font-medium text-slate-600">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <LocaleSwitcher locale={locale} />

              {user ? (
                <>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                    {user.displayName}
                  </div>
                  <form action="/api/logout" method="post">
                    <input type="hidden" name="next" value="/" />
                    <button type="submit" className="button-secondary h-10 px-4 text-sm">
                      {pick(locale, "退出", "Sign out")}
                    </button>
                  </form>
                </>
              ) : isAdmin ? (
                <>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                    {pick(locale, "超级管理员", "Super Admin")}
                  </div>
                  <form action="/api/logout" method="post">
                    <input type="hidden" name="next" value="/" />
                    <button type="submit" className="button-secondary h-10 px-4 text-sm">
                      {pick(locale, "退出", "Sign out")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="button-primary h-10 px-4 text-sm">
                    {pick(locale, "用户登录", "User Login")}
                  </Link>
                  <Link href="/admin/login" className="button-secondary h-10 px-4 text-sm">
                    {pick(locale, "管理员登录", "Admin Login")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-8 lg:px-10 lg:py-10">
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>{pick(locale, "© 2026 Apex Skills Hub · 支持在线发布、审核发布、详情展示与 ClawHub Registry 安装。", "© 2026 Apex Skills Hub · Built for publishing, reviewing, browsing, and installing skills through ClawHub Registry.")}</p>
          <p>{pick(locale, "建议部署在内网网关或统一域名下，便于团队通过 registry 统一接入。", "Recommended for deployment behind an internal gateway or unified domain so teams can consume the registry consistently.")}</p>
        </div>
      </footer>
    </div>
  );
}
