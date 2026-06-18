import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { GlobalSubmitOverlay } from "@/components/global-submit-overlay";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentUser, isAdminAuthenticated } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getAdminProfile } from "@/lib/store";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, isAdmin, locale, adminProfile] = await Promise.all([
    getCurrentUser(),
    isAdminAuthenticated(),
    getCurrentLocale(),
    getAdminProfile(),
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
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-2.5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-semibold text-white shadow-lg shadow-slate-950/15">
              AH
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-sky-700">
                APEX SKILLS HUB
              </div>
              <div className="text-[11px] text-slate-500">{pick(locale, "企业级 Skill Registry 平台", "Enterprise Skill Registry")}</div>
            </div>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <nav className="flex items-center gap-5 text-xs font-medium text-slate-600">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <LocaleSwitcher locale={locale} />
              <ThemeSwitcher />

              {user ? (
                <>
                  <AccountMenu user={user} isAdmin={false} adminName="" />
                  <form action="/api/logout" method="post">
                    <input type="hidden" name="next" value="/" />
                    <button type="submit" className="button-secondary h-8 px-3 text-xs">
                      {pick(locale, "退出", "Sign out")}
                    </button>
                  </form>
                </>
              ) : isAdmin ? (
                <>
                  <AccountMenu user={null} isAdmin adminName={adminProfile.displayName || pick(locale, "超级管理员", "Super Admin")} adminEmail={adminProfile.email} />
                  <form action="/api/logout" method="post">
                    <input type="hidden" name="next" value="/" />
                    <button type="submit" className="button-secondary h-8 px-3 text-xs">
                      {pick(locale, "退出", "Sign out")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="button-primary h-8 px-3 text-xs">
                    {pick(locale, "用户登录", "User Login")}
                  </Link>
                  <Link href="/admin/login" className="button-secondary h-8 px-3 text-xs">
                    {pick(locale, "管理员登录", "Admin Login")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-5 py-5 lg:px-8 lg:py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>{pick(locale, "© 2026 Apex Skills Hub · 支持在线发布、审核发布、详情展示与 ClawHub Registry 安装。", "© 2026 Apex Skills Hub · Built for publishing, reviewing, browsing, and installing skills through ClawHub Registry.")}</p>
          <p>{pick(locale, "建议部署在内网网关或统一域名下，便于团队通过 registry 统一接入。", "Recommended for deployment behind an internal gateway or unified domain so teams can consume the registry consistently.")}</p>
        </div>
      </footer>
      <GlobalSubmitOverlay />
    </div>
  );
}
