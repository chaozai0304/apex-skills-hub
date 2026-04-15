import { AppShell } from "@/components/app-shell";
import { getAdminCredentials } from "@/lib/config";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const credentials = getAdminCredentials();
  const showDevHint = process.env.NODE_ENV !== "production";

  return (
    <AppShell>
      <section className="mx-auto max-w-xl section-card">
        <div className="section-eyebrow">
          Admin Access
        </div>
        <h1 className="section-title mt-3">超级管理员登录</h1>
        <p className="section-description mt-4">
          登录后可进入审批控制台，对技能进行发布或驳回处理。
        </p>

        {showDevHint ? (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-800">
            <div className="font-semibold text-sky-900">当前开发环境默认账号</div>
            <div className="mt-2">登录地址：<code>/admin/login</code></div>
            <div>用户名：<code>{credentials.username}</code></div>
            <div>密码：<code>{credentials.password}</code></div>
            <div className="mt-2 text-sky-700">这些值来自项目根目录的 <code>.env</code>，上线前请务必修改。</div>
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
            用户名
            <input name="username" required className="field-input" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            密码
            <input name="password" type="password" required className="field-input" />
          </label>
          <button type="submit" className="button-primary h-12">
            登录控制台
          </button>
        </form>
      </section>
    </AppShell>
  );
}
