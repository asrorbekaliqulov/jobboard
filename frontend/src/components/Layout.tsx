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

  const tabs: NavTab[] = [
    { id: "all", label: t("nav.home") || "Asosiy", icon: "fa-house" },
    { id: "mine", label: t("nav.vacancies") || "Vakansiyalar", icon: "fa-briefcase" },
    { id: "saved", label: t("nav.saved") || "Saqlangan", icon: "fa-bookmark" },
    { id: "more", label: t("nav.more") || "Profil", icon: "fa-user" },
  ];

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
    <div className="flex flex-col h-screen max-w-md mx-auto overflow-hidden bg-slate-50">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="client-topbar bg-white px-5 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Hamburger menu icon */}
          <button className="w-8 h-8 flex items-center justify-center text-slate-600">
            <i className="fa-solid fa-bars text-lg" />
          </button>
        </div>
        <div className="flex items-center">
          <h1 className="text-lg font-black tracking-tight">
            <span className="text-slate-900">ISH</span>
            <span className="text-indigo-600">KO'P</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-8 h-8 flex items-center justify-center text-slate-600">
            <i className="fa-solid fa-bell text-lg" />
            {savedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {savedCount > 9 ? "9+" : savedCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── Main scrollable content ───────────────────────────────────────── */}
      <main
        ref={scrollRef}
        id="main-scroll-container"
        className="flex-1 overflow-y-auto pb-24"
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
        } w-10 h-10 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-90`}
      >
        <i className="fa-solid fa-chevron-up text-sm" />
      </button>

      {/* ─── Bottom Navigation ─────────────────────────────────────────────── */}
      <nav className="client-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto flex items-stretch safe-bottom">
          {tabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const isCenter = tab.id === "mine";
            
            if (isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onSubTabChange(tab.id)}
                  className="flex-1 flex flex-col items-center justify-center py-2 relative"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-5 shadow-lg ${
                    isActive ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    <i className={`fa-solid fa-plus text-lg`} />
                  </div>
                  <span className={`text-[9px] font-semibold mt-1 ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                    {t("nav.vacancies")}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`tab-press flex-1 flex flex-col items-center justify-center py-2.5 transition-all duration-200 relative bottom-nav-item ${isActive ? "active" : ""}`}
              >
                <div className="relative">
                  <i className={`fa-solid ${tab.icon} text-[18px] ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  {tab.id === "saved" && savedCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-semibold mt-1 ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="nav-dot absolute top-0 w-5 h-0.5 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
