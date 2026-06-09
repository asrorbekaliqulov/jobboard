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
    { id: "all", label: "Asosiy", icon: "fa-house" },
    { id: "mine", label: "Vakansiyalar", icon: "fa-briefcase" },
    { id: "saved", label: "Saqlangan", icon: "fa-bookmark" },
    { id: "more", label: "Profil", icon: "fa-user" },
  ];

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
      <header className="client-topbar px-5 py-3 flex justify-between items-center sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
        <button className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ color: 'var(--text-secondary)' }}>
          <i className="fa-solid fa-bars text-lg" />
        </button>
        <h1 className="text-lg font-black tracking-tight">
          <span style={{ color: 'var(--text-primary)' }}>ISH</span>
          <span style={{ color: 'var(--accent)' }}>KO'P</span>
        </h1>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl" style={{ color: 'var(--text-secondary)' }}>
          <i className="fa-solid fa-bell text-lg" />
          {savedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {savedCount > 9 ? "9+" : savedCount}
            </span>
          )}
        </button>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main ref={scrollRef} id="main-scroll-container" className="flex-1 overflow-y-auto pb-24">
        <div className={`transition-all duration-200 ease-out ${tabTransition ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          {children}
        </div>
      </main>

      {/* ─── Scroll to top ───────────────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`fixed z-40 right-4 transition-all duration-300 ${
          showScrollTop ? "bottom-24 opacity-100 scale-100" : "bottom-24 opacity-0 scale-75 pointer-events-none"
        } w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center active:scale-90`}
        style={{ background: 'var(--accent)' }}
      >
        <i className="fa-solid fa-chevron-up text-sm" />
      </button>

      {/* ─── Bottom Navigation ───────────────────────────────────────── */}
      <nav className="client-bottom-nav fixed bottom-0 left-0 right-0 z-50" style={{ borderTop: '1px solid var(--border-secondary)', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        <div className="max-w-md mx-auto flex items-stretch safe-bottom">
          {tabs.map((tab, idx) => {
            const isActive = activeSubTab === tab.id;

            // Center "E'lon berish" button
            if (idx === 2) {
              return (
                <React.Fragment key="center-plus">
                  <button
                    key={tab.id}
                    onClick={() => onSubTabChange(tab.id)}
                    className={`tab-press flex-1 flex flex-col items-center justify-center py-2.5 transition-all relative`}
                  >
                    <i className={`fa-solid ${tab.icon} text-[18px]`} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span className="text-[9px] font-semibold mt-1" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {tab.label}
                    </span>
                    {isActive && <span className="nav-dot absolute top-0 w-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                  </button>
                </React.Fragment>
              );
            }

            // Add center "+" button between index 1 and 2
            if (idx === 1) {
              return (
                <React.Fragment key="mine-plus">
                  <button
                    key={tab.id}
                    onClick={() => onSubTabChange(tab.id)}
                    className={`tab-press flex-1 flex flex-col items-center justify-center py-2.5 transition-all relative`}
                  >
                    <i className={`fa-solid ${tab.icon} text-[18px]`} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span className="text-[9px] font-semibold mt-1" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {tab.label}
                    </span>
                    {isActive && <span className="nav-dot absolute top-0 w-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                  </button>
                  {/* Center action button */}
                  <div className="flex-1 flex items-center justify-center">
                    <button
                      onClick={() => onSubTabChange("mine")}
                      className="w-12 h-12 rounded-full flex items-center justify-center -mt-5 shadow-lg text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      <i className="fa-solid fa-plus text-lg" />
                    </button>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`tab-press flex-1 flex flex-col items-center justify-center py-2.5 transition-all relative`}
              >
                <i className={`fa-solid ${tab.icon} text-[18px]`} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-[9px] font-semibold mt-1" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tab.label}
                </span>
                {isActive && <span className="nav-dot absolute top-0 w-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
