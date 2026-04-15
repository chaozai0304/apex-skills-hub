import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto max-w-xl section-card">
        <div className="section-eyebrow">User Access</div>
        <h1 className="section-title mt-3">普通用户登录</h1>
        <p className="section-description mt-4">
          普通用户登录后可在技能详情页进行评分、收藏，并在“我的技能”中查看个人互动记录。
        </p>

        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-800">
          <div className="font-semibold text-sky-900">开发环境演示账号</div>
          <div className="mt-2">用户名：<code>demo</code></div>
          <div>密码：<code>demo123</code></div>
          <div className="mt-2">管理员也可以在控制台中手动创建更多普通用户。</div>
        </div>

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <form action="/api/login" method="post" className="mt-8 grid gap-5">
          <input type="hidden" name="next" value={resolvedSearchParams.next || "/my-skills"} />
          <label className="grid gap-2 text-sm text-slate-600">
            用户名
            <input name="username" required className="field-input" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            密码
            <input name="password" type="password" required className="field-input" />
          </label>
          <button type="submit" className="button-primary h-12">
            登录账户
          </button>
        </form>
      </section>
    </AppShell>
  );
}
