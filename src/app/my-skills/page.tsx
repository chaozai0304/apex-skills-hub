import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboard } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MySkillsPageProps = {
  searchParams: Promise<{ accountSuccess?: string; accountError?: string }>;
};

export default async function MySkillsPage({ searchParams }: MySkillsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/my-skills");
  }

  const [dashboard, resolvedSearchParams] = await Promise.all([
    getUserDashboard(user.id),
    searchParams,
  ]);

  return (
    <AppShell>
      <section className="section-card">
        <div className="section-eyebrow">Workspace</div>
        <h1 className="section-title mt-3">我的技能工作台</h1>
        <p className="section-description mt-4 max-w-3xl">
          欢迎回来，{user.displayName}。这里集中展示你收藏过的技能、你给出的评分记录，以及账户安全设置。
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/publish" className="button-primary h-12 px-6 text-sm">
            发布新技能
          </Link>
          <Link href="/publish?mode=update" className="button-secondary h-12 px-6 text-sm">
            提交已有技能新版本
          </Link>
        </div>
        <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
          更新技能时请保持原有 <code>slug</code> 不变，仅提升 <code>version</code>。管理员审批通过后，
          <code className="mx-1 rounded bg-white px-2 py-1 text-slate-900">npx clawhub install &lt;slug&gt; --registry ...</code>
          默认会安装该技能的最新发布版本。
        </div>
      </section>

      {resolvedSearchParams.accountSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          密码已更新，下次登录请使用新密码。
        </div>
      ) : null}

      {resolvedSearchParams.accountError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {resolvedSearchParams.accountError}
        </div>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card p-8">
          <div className="section-eyebrow">Account</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">账户资料</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">显示名称</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{user.displayName}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">用户名</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{user.username}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">加入时间</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{formatDateTime(user.createdAt)}</div>
            </div>
          </div>
        </div>

        <div className="surface-card p-8">
          <div className="section-eyebrow">Security</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">修改密码</h2>
          <form action="/api/account/password" method="post" className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-600">
              当前密码
              <input name="currentPassword" type="password" required className="field-input" />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              新密码
              <input name="nextPassword" type="password" required minLength={6} className="field-input" />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              确认新密码
              <input name="confirmPassword" type="password" required minLength={6} className="field-input" />
            </label>
            <button type="submit" className="button-primary h-12">
              更新密码
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">我的收藏</h2>
          <div className="mt-4 grid gap-4">
            {dashboard.favorites.map((item) => (
              <div key={item.id} className="surface-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{item.displayName}</h3>
                    <div className="mt-2 text-sm text-slate-500">{item.slug} · {item.version}</div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.summary}</p>
                  </div>
                  <Link href={`/skills/${item.slug}`} className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                    查看详情 →
                  </Link>
                </div>
              </div>
            ))}

            {!dashboard.favorites.length ? (
              <div className="surface-card p-8 text-sm text-slate-500">
                你还没有收藏任何技能，去详情页点一点“加入收藏”吧。
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">我的评分</h2>
          <div className="mt-4 grid gap-4">
            {dashboard.ratings.map((item) => (
              <div key={item.submission.id} className="surface-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {item.submission.displayName}
                    </h3>
                    <div className="mt-2 text-sm text-slate-500">
                      {item.submission.slug} · 最近评分于 {formatDateTime(item.updatedAt)}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">当前评分：{item.rating} / 5</p>
                  </div>
                  <Link href={`/skills/${item.submission.slug}`} className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                    继续查看 →
                  </Link>
                </div>
              </div>
            ))}

            {!dashboard.ratings.length ? (
              <div className="surface-card p-8 text-sm text-slate-500">
                你还没有给任何技能评分，登录后可以在详情页为优质技能点赞打分。
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
