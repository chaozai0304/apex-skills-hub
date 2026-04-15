"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.toString();
  const next = `${pathname}${current ? `?${current}` : ""}`;

  function handleSwitch(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }

    window.location.assign(`/api/locale?locale=${nextLocale}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {([
        { key: "zh", label: "中文" },
        { key: "en", label: "EN" },
      ] as const).map((item) => {
        const active = item.key === locale;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleSwitch(item.key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-slate-950 !text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
