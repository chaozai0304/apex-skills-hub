"use client";

import { useState } from "react";

import type { UserRecord } from "@/lib/types";

type AccountMenuProps = {
  user: UserRecord | null;
  isAdmin: boolean;
  adminName: string;
  adminEmail?: string;
};

export function AccountMenu({ user, isAdmin, adminName, adminEmail = "" }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const label = user?.displayName || (isAdmin ? adminName : "");

  if (!label) {
    return null;
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="h-7 rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200">
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-2xl">
          <div className="font-semibold text-slate-950">账户信息</div>
          <p className="mt-1 text-[11px] text-slate-500">修改显示名称、邮箱、组织与密码。</p>
          <form action="/api/account/profile" method="post" className="mt-3 grid gap-2" data-loading-message="正在保存账户信息...">
            <input type="hidden" name="accountType" value={user ? "user" : "admin"} />
            <label className="grid gap-1 text-slate-600">
              显示名称
              <input name="displayName" required defaultValue={label} className="field-input h-8" />
            </label>
            <label className="grid gap-1 text-slate-600">
              邮箱
              <input name="email" type="email" defaultValue={user?.email || adminEmail} placeholder="用于飞书个人消息通知" className="field-input h-8" />
            </label>
            {user ? (
              <>
                <label className="grid gap-1 text-slate-600">
                  角色
                  <input name="roleLabel" defaultValue={user.roleLabel} className="field-input h-8" />
                </label>
                <label className="grid gap-1 text-slate-600">
                  组织
                  <input name="organization" defaultValue={user.organization} className="field-input h-8" />
                </label>
              </>
            ) : null}
            <label className="grid gap-1 text-slate-600">
              新密码
              <input name="password" type="password" placeholder={isAdmin ? "超管密码来自环境变量，此处仅更新资料" : "留空则不修改"} disabled={isAdmin && !user} className="field-input h-8" />
            </label>
            <button className="button-primary h-8 px-3 text-xs">保存信息</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
