"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGE = "正在处理，请稍候...";

export function GlobalSubmitOverlay() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function show(nextMessage?: string) {
      setMessage(nextMessage || DEFAULT_MESSAGE);
    }

    function hide() {
      setMessage(null);
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.dataset.noGlobalLoading === "true" || !form.checkValidity()) {
        return;
      }

      const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
      const nextMessage = submitter?.dataset.loadingMessage || form.dataset.loadingMessage || DEFAULT_MESSAGE;
      show(nextMessage);
    }

    function handleShow(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      show(detail?.message);
    }

    window.addEventListener("submit", handleSubmit, true);
    window.addEventListener("app-loading-start", handleShow as EventListener);
    window.addEventListener("app-loading-stop", hide);

    return () => {
      window.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("app-loading-start", handleShow as EventListener);
      window.removeEventListener("app-loading-stop", hide);
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="flex min-w-64 items-center gap-3 rounded-2xl border border-white/70 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-2xl">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" />
        {message}
      </div>
    </div>
  );
}
