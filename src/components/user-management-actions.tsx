"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Upload, UserPlus, PencilLine } from "lucide-react";

import type { UserRecord } from "@/lib/types";

export function UserManagementActions() {
  const [modal, setModal] = useState<"create" | "import" | null>(null);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setModal("create")} className="button-primary h-8 gap-1.5 px-3 text-xs">
        <UserPlus className="h-3.5 w-3.5" />
        新建用户
      </button>
      <button type="button" onClick={() => setModal("import")} className="button-secondary h-8 gap-1.5 px-3 text-xs">
        <Upload className="h-3.5 w-3.5" />
        导入用户
      </button>
      <a href="/api/admin/users" className="button-secondary h-8 px-3 text-xs">下载模板</a>

      {modal === "create" ? (
        <Modal title="新建用户" onClose={() => setModal(null)}>
          <UserForm submitText="创建用户" loadingMessage="正在创建用户..." />
        </Modal>
      ) : null}

      {modal === "import" ? (
        <Modal title="导入用户" onClose={() => setModal(null)}>
          <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] leading-5 text-sky-800">
            请先下载 CSV 模板，补充用户名、邮箱、显示名称、密码、角色和组织后再导入。
          </div>
          <form action="/api/admin/users" method="post" encType="multipart/form-data" className="grid gap-3" data-loading-message="正在导入用户...">
            <input type="hidden" name="intent" value="import" />
            <input name="file" type="file" accept=".csv,text/csv" required className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="button-secondary h-8 px-3 text-xs">取消</button>
              <button className="button-primary h-8 px-3 text-xs">导入 CSV</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export function UserEditButton({ user }: { user: UserRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-sky-100 bg-sky-50 px-2.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100">
        <PencilLine className="h-3 w-3" />
        标记/编辑
      </button>
      {open ? (
        <Modal title={`编辑用户：${user.username}`} onClose={() => setOpen(false)}>
          <UserForm user={user} submitText="保存用户" loadingMessage="正在更新用户..." />
        </Modal>
      ) : null}
    </>
  );
}

function UserForm({ user, submitText, loadingMessage }: { user?: UserRecord; submitText: string; loadingMessage: string }) {
  return (
    <form action="/api/admin/users" method="post" className="grid gap-3" data-loading-message={loadingMessage}>
      <input type="hidden" name="intent" value={user ? "update" : "create"} />
      {user ? <input type="hidden" name="userId" value={user.id} /> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-600">
          用户名
          <input name="username" required={!user} defaultValue={user?.username} disabled={Boolean(user)} className="field-input h-9 disabled:cursor-not-allowed disabled:bg-slate-100" />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          邮箱
          <input name="email" type="email" defaultValue={user?.email} placeholder="name@example.com" className="field-input h-9" />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-slate-600">
        显示名称
        <input name="displayName" required defaultValue={user?.displayName} className="field-input h-9" />
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-600">
          角色
          <input name="roleLabel" defaultValue={user?.roleLabel} placeholder="成员/负责人" className="field-input h-9" />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          组织
          <input name="organization" defaultValue={user?.organization} placeholder="部门/团队" className="field-input h-9" />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-slate-600">
        {user ? "新密码" : "初始密码"}
        <input name="password" type="password" required={!user} placeholder={user ? "留空则不修改" : "至少 6 位"} className="field-input h-9" />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" className="button-primary h-8 px-4 text-xs">{submitText}</button>
      </div>
    </form>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="text-base font-semibold text-slate-950">{title}</div>
          <button type="button" onClick={onClose} className="button-secondary h-7 px-3 text-[11px]">关闭</button>
        </div>
        {children}
      </div>
    </div>
  );
}
