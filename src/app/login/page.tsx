import { AppShell } from "@/components/app-shell";
import { pick } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = await getCurrentLocale();

  return (
    <AppShell>
      <section className="mx-auto max-w-xl section-card">
        <div className="section-eyebrow">User Access</div>
        <h1 className="section-title mt-3">{pick(locale, "普通用户登录", "User Login")}</h1>
        <p className="section-description mt-4">
          {pick(locale, "普通用户登录后可在技能详情页进行评分、收藏，并在“我的技能”中查看个人互动记录。", "After signing in, users can rate and favorite skills on the detail page, then review their activity in My Skills.")}
        </p>

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <form action="/api/login" method="post" className="mt-8 grid gap-5">
          <input type="hidden" name="next" value={resolvedSearchParams.next || "/my-skills"} />
          <label className="grid gap-2 text-sm text-slate-600">
            {pick(locale, "用户名", "Username")}
            <input name="username" required className="field-input" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            {pick(locale, "密码", "Password")}
            <input name="password" type="password" required className="field-input" />
          </label>
          <button type="submit" className="button-primary h-12">
            {pick(locale, "登录账户", "Sign in")}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
