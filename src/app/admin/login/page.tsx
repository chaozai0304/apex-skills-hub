import { AppShell } from "@/components/app-shell";
import { getAdminCredentials } from "@/lib/config";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = await getCurrentLocale();
  const credentials = getAdminCredentials();
  const showDevHint = process.env.NODE_ENV !== "production";

  return (
    <AppShell>
      <section className="mx-auto max-w-xl section-card">
        <div className="section-eyebrow">
          Admin Access
        </div>
        <h1 className="section-title mt-3">{pick(locale, "超级管理员登录", "Super Admin Login")}</h1>
        <p className="section-description mt-4">
          {pick(locale, "登录后可进入审批控制台，对技能进行发布或驳回处理。", "After signing in, you can access the review console to publish or reject submitted skills.")}
        </p>

        {showDevHint ? (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-800">
            <div className="font-semibold text-sky-900">{pick(locale, "当前开发环境默认账号", "Default development credentials")}</div>
            <div className="mt-2">{pick(locale, "登录地址：", "Login path: ")}<code>/admin/login</code></div>
            <div>{pick(locale, "用户名：", "Username: ")}<code>{credentials.username}</code></div>
            <div>{pick(locale, "密码：", "Password: ")}<code>{credentials.password}</code></div>
            <div className="mt-2 text-sky-700">{pick(locale, "这些值来自项目根目录的 ", "These values come from the project root ")}<code>.env</code>{pick(locale, "，上线前请务必修改。", ". Be sure to change them before production deployment.")}</div>
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <form action="/api/admin/login" method="post" className="mt-8 grid gap-5">
          <input type="hidden" name="next" value={resolvedSearchParams.next || "/admin"} />
          <label className="grid gap-2 text-sm text-slate-600">
            {pick(locale, "用户名", "Username")}
            <input name="username" required className="field-input" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            {pick(locale, "密码", "Password")}
            <input name="password" type="password" required className="field-input" />
          </label>
          <button type="submit" className="button-primary h-12">
            {pick(locale, "登录控制台", "Sign in to console")}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
