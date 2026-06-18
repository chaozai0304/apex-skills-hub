"use client";

import { useEffect, useSyncExternalStore } from "react";

const THEMES = [
  { key: "default", label: "浅" },
  { key: "midnight", label: "夜" },
  { key: "emerald", label: "绿" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];
const THEME_EVENT = "apex-theme-change";
const MIDNIGHT_THEME_STYLE = `
[data-theme="midnight"] body,
[data-theme="midnight"] h1,
[data-theme="midnight"] h2,
[data-theme="midnight"] h3,
[data-theme="midnight"] .text-slate-950,
[data-theme="midnight"] .text-slate-900,
[data-theme="midnight"] .text-slate-800{color:#f8fbff!important;}
[data-theme="midnight"] .text-slate-700,
[data-theme="midnight"] .text-slate-600,
[data-theme="midnight"] .text-slate-500{color:#a9b8cc!important;}
[data-theme="midnight"] .section-card,
[data-theme="midnight"] .surface-card{border-color:rgba(125,211,252,.28)!important;background:rgba(15,23,42,.86)!important;}
[data-theme="midnight"] header,
[data-theme="midnight"] footer{border-color:rgba(125,211,252,.18)!important;background:rgba(8,17,31,.92)!important;}
[data-theme="midnight"] .bg-white,
[data-theme="midnight"] .bg-white\\/90,
[data-theme="midnight"] .bg-white\\/80,
[data-theme="midnight"] .bg-white\\/70,
[data-theme="midnight"] .bg-slate-50,
[data-theme="midnight"] .bg-slate-50\\/90,
[data-theme="midnight"] .bg-slate-50\\/80,
[data-theme="midnight"] .bg-slate-50\\/70,
[data-theme="midnight"] .bg-slate-100{border-color:rgba(125,211,252,.2)!important;background:rgba(15,23,42,.86)!important;}
[data-theme="midnight"] table,
[data-theme="midnight"] thead,
[data-theme="midnight"] tbody,
[data-theme="midnight"] tr,
[data-theme="midnight"] th,
[data-theme="midnight"] td{border-color:rgba(125,211,252,.18)!important;}
[data-theme="midnight"] .field-input,
[data-theme="midnight"] input,
[data-theme="midnight"] textarea,
[data-theme="midnight"] select{border-color:rgba(125,211,252,.28)!important;background:rgba(2,6,23,.76)!important;color:#e5edf8!important;}
[data-theme="midnight"] .button-secondary{border-color:rgba(125,211,252,.3)!important;background:rgba(15,23,42,.92)!important;color:#dce8f7!important;}
[data-theme="midnight"] .button-primary{background:linear-gradient(135deg,#0284c7,#14b8a6)!important;color:#fff!important;}
`;

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  function applyTheme(next: ThemeKey) {
    document.documentElement.dataset.theme = next === "default" ? "" : next;
  }

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleSelect(next: ThemeKey) {
    localStorage.setItem("apex-theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white/80 p-0.5 text-[10px] shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: MIDNIGHT_THEME_STYLE }} />
      {THEMES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => handleSelect(item.key)}
          className={`h-6 rounded-full px-2 font-semibold transition ${theme === item.key ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getThemeSnapshot(): ThemeKey {
  return normalizeTheme(localStorage.getItem("apex-theme"));
}

function getServerThemeSnapshot(): ThemeKey {
  return "default";
}

function normalizeTheme(value: string | null): ThemeKey {
  return THEMES.some((item) => item.key === value) ? value as ThemeKey : "default";
}
