import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { UserRole } from "../types.ts";

type Section = "vacancies" | "workers" | "daily-workers";
type SubTab = "all" | "mine" | "saved" | "more";

interface LayoutProps {
  children: React.ReactNode;
  activeSection: Section;
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  role: UserRole;
  onToggleRole?: () => void;
  savedCount?: number;
}

interface NavTab {
  id: SubTab;
  label: string;
  icon: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeSection,
  activeSubTab,
  onSubTabChange,
  role,
  onToggleRole,
  savedCount = 0,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tabTransition, setTabTransition] = useState(false);
  const prevTab = useRef(activeSubTab);

  const isCandidate = role === UserRole.JOB_SEEKER;
  const isDailyJobSeeker = role === UserRole.DAILY_JOB_SEEKER;

  /* ─── Role-based accent classes ───────────────────────────────────────── */
  const accentText = isCandidate
    ? "text-blue-500"
    : isDailyJobSeeker
      ? "text-emerald-500"
      : "text-violet-500";

  const accentBg = isCandidate
    ? "bg-blue-500"
    : isDailyJobSeeker
      ? "bg-emerald-500"
      : "bg-violet-500";

  const navGlow = isCandidate
    ? "nav-glow-blue"
    : isDailyJobSeeker
      ? "nav-glow-emerald"
      : "nav-glow-violet";

  const meshBg = isCandidate
    ? "bg-mesh-blue"
    : isDailyJobSeeker
      ? "bg-mesh-emerald"
      : "bg-mesh-violet";

  const badgeClasses = isCandidate
    ? "bg-blue-50 text-blue-600 border-blue-100"
    : isDailyJobSeeker
      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
      : "bg-violet-50 text-violet-600 border-violet-100";

  const tabs: Record<Section, NavTab[]> = {
    vacancies: [
      { id: "all", label: t("nav.vacancies"), icon: "fa-briefcase" },
      { id: "mine", label: t("nav.my_vacancies"), icon: "fa-folder-open" },
      { id: "saved", label: t("nav.saved"), icon: "fa-bookmark" },
      { id: "more", label: t("nav.more"), icon: "fa-ellipsis" },
    ],
    workers: [
      { id: "all", label: t("nav.resumes"), icon: "fa-users" },
      { id: "mine", label: t("nav.my_resumes"), icon: "fa-user-check" },
      { id: "saved", label: t("nav.saved"), icon: "fa-bookmark" },
      { id: "more", label: t("nav.more"), icon: "fa-ellipsis" },
    ],
    "daily-workers": [
      { id: "all", label: t("nav.resumes"), icon: "fa-people-group" },
      { id: "mine", label: t("nav.my_resumes"), icon: "fa-user-check" },
      { id: "saved", label: t("nav.saved"), icon: "fa-bookmark" },
      { id: "more", label: t("nav.more"), icon: "fa-ellipsis" },
    ],
  };

  const currentTabs = tabs[activeSection];

  /* ─── Scroll-to-top visibility ────────────────────────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Tab switch animation ────────────────────────────────────────────── */
  useEffect(() => {
    if (prevTab.current !== activeSubTab) {
      setTabTransition(true);
      const timer = setTimeout(() => setTabTransition(false), 250);
      prevTab.current = activeSubTab;
      return () => clearTimeout(timer);
    }
  }, [activeSubTab]);

  return (
      <div className={`flex flex-col h-screen max-w-md mx-auto overflow-hidden ${meshBg} bg-onboarding`}>
      {/* ─── Header ────────────────────────────────────────────────────────── */}
        <header className="client-topbar bg-white/80 glass px-5 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo_new.png"
            alt="Ish Ko'p"
            className="w-10 h-10 object-contain"
          />
          <h1 className={`text-lg font-extrabold tracking-tight ${accentText}`}>
            Ish Ko'p
          </h1>
        </div>
        <button
          onClick={onToggleRole}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer border ${badgeClasses}`}
        >
          {isCandidate
            ? t("role.candidate")
            : isDailyJobSeeker
              ? t("role.daily_job_seeker")
              : t("role.partner")}
        </button>
      </header>

      {/* ─── Main scrollable content with tab transition ───────────────────── */}
      <main
        ref={scrollRef}
        id="main-scroll-container"
        className="flex-1 overflow-y-auto px-4 pt-3 pb-28"
      >
        <div className={`transition-all duration-200 ease-out ${
          tabTransition ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}>
          {children}
        </div>
      </main>

      {/* ─── Scroll to top button ──────────────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`fixed z-40 right-4 transition-all duration-300 ${
          showScrollTop
            ? "bottom-24 opacity-100 scale-100"
            : "bottom-24 opacity-0 scale-75 pointer-events-none"
        } w-10 h-10 rounded-xl ${accentBg} text-white shadow-lg flex items-center justify-center active:scale-90`}
        style={{ maxWidth: '28rem', marginLeft: 'auto' }}
      >
        <i className="fa-solid fa-chevron-up text-sm" />
      </button>

      {/* ─── Bottom nav with glow + saved badge ────────────────────────────── */}
      <nav className="client-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/60">
        <div className="max-w-md mx-auto px-3 pb-2">
          <div className={`bg-white/80 glass border border-slate-200/50 rounded-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.06)] flex items-stretch safe-bottom ${navGlow}`}>

            {currentTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              const hasBadge = tab.id === "saved" && savedCount > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSubTabChange(tab.id)}
                  className={`tab-press flex-1 flex flex-col items-center justify-center gap-1 py-2.5 pt-3 transition-all duration-200 relative ${
                    isActive ? accentText : "text-slate-400"
                  }`}
                >
                  <div className="relative">
                    <i
                      className={`fa-solid ${tab.icon} transition-all duration-200 ${
                        isActive ? `text-[18px] ${navGlow}` : "text-[15px]"
                      }`}
                    />
                    {/* Saved badge */}
                    {hasBadge && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {savedCount > 99 ? "99+" : savedCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive ? accentText : "text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span
                      className={`nav-dot absolute -bottom-0.5 w-1 h-1 rounded-full ${accentBg}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
