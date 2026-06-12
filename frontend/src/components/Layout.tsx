import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { UserRole } from "../types.ts";
import ThemeToggle from "./ThemeToggle.tsx";
import { useTheme } from "../hooks/useTheme.ts";

type Section = "vacancies" | "workers" | "daily-workers";
type SubTab = "all" | "mine" | "saved" | "more";

interface LayoutProps {
  children: React.ReactNode;
  activeSection: Section;
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  onPlusPress?: () => void;
  role: UserRole;
  onToggleRole?: () => void;
  savedCount?: number;
}

interface NavTab {
  id: SubTab;
  labelKey: string;
  icon: string;
}

const LANG_LABELS: Record<string, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

const LANG_CYCLE = ["uz", "ru", "en"];

const Layout: React.FC<LayoutProps> = ({
  children,
  activeSection,
  activeSubTab,
  onSubTabChange,
  onPlusPress,
  role,
  onToggleRole,
  savedCount = 0,
}) => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tabTransition, setTabTransition] = useState(false);
  const prevTab = useRef(activeSubTab);

  const tabs: NavTab[] = [
    { id: "all", labelKey: "nav.home", icon: "fa-house" },
    { id: "mine", labelKey: role === UserRole.CANDIDATE_HUNTER ? "nav.vacancies" : role === UserRole.DAILY_JOB_SEEKER ? "nav.daily_workers" : "nav.workers", icon: role === UserRole.CANDIDATE_HUNTER ? "fa-briefcase" : "fa-users" },
    { id: "saved", labelKey: "nav.saved", icon: "fa-bookmark" },
    { id: "more", labelKey: "nav.profile", icon: "fa-user" },
  ];

  const cycleLang = () => {
    const currentIdx = LANG_CYCLE.indexOf(i18n.language);
    const nextIdx = (currentIdx + 1) % LANG_CYCLE.length;
    i18n.changeLanguage(LANG_CYCLE[nextIdx]);
  };

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

  useEffect(() => {
    if (prevTab.current !== activeSubTab) {
      setTabTransition(true);
      const timer = setTimeout(() => setTabTransition(false), 250);
      prevTab.current = activeSubTab;
      return () => clearTimeout(timer);
    }
  }, [activeSubTab]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-50" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <img
            src={isDark ? "/logo.png" : "/logo_new.png"}
            alt="ISHKO'P"
            className="h-9 w-auto object-contain object-left select-none"
          />
          <h1 className="text-xl font-black tracking-tight">
            <span style={{ color: 'var(--text-primary)' }}>ISH</span><span style={{ color: 'var(--accent)' }}>KO'P</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Role indicator badge */}
          <button
            onClick={onToggleRole}
            className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-all active:scale-95 mr-1"
            style={{
              backgroundColor: role === UserRole.CANDIDATE_HUNTER 
                ? 'rgba(99, 102, 241, 0.1)' 
                : role === UserRole.DAILY_JOB_SEEKER 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(59, 130, 246, 0.1)',
              borderColor: role === UserRole.CANDIDATE_HUNTER 
                ? 'rgba(99, 102, 241, 0.3)' 
                : role === UserRole.DAILY_JOB_SEEKER 
                  ? 'rgba(16, 185, 129, 0.3)' 
                  : 'rgba(59, 130, 246, 0.3)',
              color: role === UserRole.CANDIDATE_HUNTER 
                ? '#6366f1' 
                : role === UserRole.DAILY_JOB_SEEKER 
                  ? '#10b981' 
                  : '#3b82f6'
            }}
          >
            <i className={`fa-solid ${
              role === UserRole.CANDIDATE_HUNTER 
                ? 'fa-user-tie' 
                : role === UserRole.DAILY_JOB_SEEKER 
                  ? 'fa-calendar-day' 
                  : 'fa-user-graduate'
            } mr-1`} />
            {role === UserRole.CANDIDATE_HUNTER 
              ? t('role.partner_short') || 'Ish beruvchi'
              : role === UserRole.DAILY_JOB_SEEKER 
                ? t('role.daily_short') || 'Kunlik'
                : t('role.candidate_short') || 'Ishchi'}
          </button>
          {/* Language toggle */}
          <button
            onClick={cycleLang}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 border"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }}
          >
            <span className="text-[10px] font-black uppercase">{LANG_LABELS[i18n.language] || "UZ"}</span>
          </button>
          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main ref={scrollRef} id="main-scroll-container" className="flex-1 overflow-y-auto pb-32">
        <div className={`transition-all duration-200 ease-out ${tabTransition ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          {children}
        </div>
      </main>

      {/* ─── Scroll to top ───────────────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`fixed z-40 right-4 transition-all duration-300 ${
          showScrollTop ? "bottom-32 opacity-100 scale-100" : "bottom-32 opacity-0 scale-75 pointer-events-none"
        } w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center active:scale-90`}
        style={{ background: 'var(--accent)' }}
      >
        <i className="fa-solid fa-chevron-up text-sm" />
      </button>

      {/* ─── Bottom Navigation ───────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-primary)', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around safe-bottom pt-3 pb-4">
          {/* First two tabs */}
          {tabs.slice(0, 2).map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-2 transition-all active:scale-90"
              >
                <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '25px', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[11px] font-bold mt-2" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}

          {/* Center + button */}
          <div className="flex items-center justify-center px-3">
            <button
              onClick={onPlusPress}
              className="w-16 h-16 rounded-full flex items-center justify-center -mt-8 shadow-xl text-white active:scale-90 transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)' }}
            >
              <i className="fa-solid fa-plus text-2xl" />
            </button>
          </div>

          {/* Last two tabs */}
          {tabs.slice(2).map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-2 transition-all active:scale-90"
              >
                <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '25px', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[11px] font-bold mt-2" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
