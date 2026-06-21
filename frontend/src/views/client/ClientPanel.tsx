import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UserRole,
  Vacancy,
  Resume,
  DailyJobSeeker,
  ItemStatus,
  Profession,
  Region,
  User,
  Work,
} from "../../types.ts";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout.tsx";
import { authService } from "../../services/auth.ts";
import {
  SearchableSelect,
  Pagination,
  ConfirmModal,
} from "../../components/Shared.tsx";
import { professionService } from "../../services/professionService.ts";
import { worksService } from "../../services/worksService.ts";
import FilterModal from "../../components/FilterModal.tsx";
import { regionService } from "../../services/regionService.ts";
import {
  ClientVacancyExplorerCard,
  ClientVacancyOwnerCard,
  ClientResumeExplorerCard,
  ClientResumeOwnerCard,
} from "./ClientComponents.tsx";
import { useToast } from "../../components/Toast.tsx";
import { SkeletonList } from "../../components/SkeletonCard.tsx";
import Icon3D from "../../components/Icon3D.tsx";
import { getProfessionIcon, getCategoryColor } from "../../utils/professionIcons.ts";
import AIPanel from "./AIPanel.tsx";
import { AISearchResults, HHVacancyCard, useHHVacancies, AIBanner } from "../../components/AIIntegrated.tsx";
import { VoiceSearchButton } from "../../components/VoiceSearch.tsx";

interface ClientPanelProps {
  initialRole: UserRole;
  deepLink?: { type: "vacancy" | "resume"; id: number } | null;
  onDeepLinkConsumed?: () => void;
  vacancies: Vacancy[];
  resumes: Resume[];
  dailyJobSeekers: DailyJobSeeker[];
  savedIds: number[];
  savedDailyJobSeekerIds: number[];
  onToggleVacancySave: (id: number) => void;
  onToggleResumeSave: (id: number) => void;
  onToggleDailyJobSeekerSave: (id: number) => void;
  onAddVacancy: () => void;
  onAddResume: () => void;
  onEditVacancy: (v: Vacancy) => void;
  onEditResume: (r: Resume) => void;
  onEditDailyJobSeeker?: (r: DailyJobSeeker) => void;
  onDeleteVacancy: (id: number) => void;
  onDeleteResume: (id: number) => void;
  onDeleteDailyJobSeeker?: (id: number) => void;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  currentUser: User | null;
  onFetchResumes?: (filters: any) => void;
  onFetchVacancies?: (filters: any) => void;
  onFetchDailyJobSeekers?: (filters: any) => void;
}

const ClientPanel: React.FC<ClientPanelProps> = ({
  initialRole,
  deepLink,
  onDeepLinkConsumed,
  vacancies,
  resumes,
  dailyJobSeekers,
  savedIds,
  savedDailyJobSeekerIds,
  onToggleVacancySave,
  onToggleResumeSave,
  onToggleDailyJobSeekerSave,
  onAddVacancy,
  onAddResume,
  onEditVacancy,
  onEditResume,
  onEditDailyJobSeeker,
  onDeleteVacancy,
  onDeleteResume,
  onDeleteDailyJobSeeker,
  onRoleChange,
  onLogout,
  currentUser,
  onFetchResumes,
  onFetchVacancies,
  onFetchDailyJobSeekers,
}) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [isNavigating, setIsNavigating] = useState(false);

  const getLocalizedName = useCallback(
    (item: any) => {
      const lang = i18n.language?.toLowerCase() || "en";
      return (
        item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz
      );
    },
    [i18n.language],
  );

  const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "ru", name: "Русский" },
    { code: "uz", name: "O'zbekcha" },
  ];

  const sectionForRole = (role: UserRole): "vacancies" | "workers" | "daily-workers" => {
    // Rolega qarab foydalanuvchi nimani KO'RISHI kerakligini aniqlash:
    // Ishchi (JOB_SEEKER) — vakansiyalarni ko'radi (ish qidiradi)
    // Ish beruvchi (CANDIDATE_HUNTER) — ishchilarni ko'radi (ishchi qidiradi)
    // Kunlik ishchi (DAILY_JOB_SEEKER) — vakansiyalarni ko'radi (kunlik ish qidiradi)
    if (role === UserRole.CANDIDATE_HUNTER) return "workers";
    if (role === UserRole.DAILY_JOB_SEEKER) return "vacancies";
    return "vacancies"; // JOB_SEEKER sees vacancies
  };

  const [activeSection, setActiveSection] = useState<"vacancies" | "workers" | "daily-workers">(
    () => sectionForRole(initialRole),
  );
  const [activeSubTab, setActiveSubTab] = useState<"all" | "mine" | "saved" | "more">("all");
  const [page, setPage] = useState(1);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoleSaving, setIsRoleSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const perPage = 5;
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeFilterChip, setActiveFilterChip] = useState("all");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categories, setCategories] = useState<Profession[]>([]);

  const [filters, setFilters] = useState({
    profession: "",
    region: "",
    gender: "all",
    age_range: "",
    salary_range: "",
    work_format: "",
    work_type: "",
    experience: "",
    search: "",
  });
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isProfLoading, setIsProfLoading] = useState(false);
  const [isRegionLoading, setIsRegionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string | number;
    type: "v" | "r" | "d";
  } | null>(null);

  // Deep link item (opened from bot URL)
  const [deepLinkItem, setDeepLinkItem] = useState<any>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);

  useEffect(() => {
    if (!deepLink) return;
    setDeepLinkLoading(true);
    const fetchItem = async () => {
      try {
        if (deepLink.type === "vacancy") {
          const v = await vacancyService.getVacancyById(deepLink.id);
          setDeepLinkItem({ kind: "vacancy", data: v });
        } else {
          const r = await resumeService.getResume(deepLink.id);
          setDeepLinkItem({ kind: "resume", data: r });
        }
      } catch (e) {
        console.error("Deep link fetch failed", e);
      } finally {
        setDeepLinkLoading(false);
        onDeepLinkConsumed?.();
      }
    };
    fetchItem();
  }, [deepLink]);

  // HeadHunter vacancies (loaded once)
  const hhVacancies = useHHVacancies(searchText);

  const professionOptions = useMemo(
    () => professions.map((p) => ({ value: p.id, label: getLocalizedName(p) })),
    [professions, getLocalizedName],
  );

  const regionOptions = useMemo(
    () => regions.map((r) => ({ value: r.id, label: getLocalizedName(r) })),
    [regions, getLocalizedName],
  );

  useEffect(() => {
    handleProfessionSearch("");
    handleRegionSearch("");
    // Fetch works for the categories modal
    if (authService.isAuthenticated()) {
      worksService.getWorks({ limit: 200 })
        .then(res => setWorks(res.items || []))
        .catch(console.error);
    }
  }, []);

  const prevRoleRef = useRef(initialRole);
  useEffect(() => {
    if (prevRoleRef.current !== initialRole) {
      prevRoleRef.current = initialRole;
      setActiveSection(sectionForRole(initialRole));
      setActiveSubTab("all");
      setPage(1);
    }
  }, [initialRole]);

  // Close filter modal when navigating between tabs/sections
  useEffect(() => {
    setIsFilterModalOpen(false);
  }, [activeSubTab, activeSection]);

  useEffect(() => {
    if (isFilterModalOpen || isRoleModalOpen || isLangModalOpen || deleteTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterModalOpen, isRoleModalOpen, isLangModalOpen, deleteTarget]);

  const handleProfessionSearch = useCallback(async (search: string) => {
    if (!authService.isAuthenticated()) return;
    setIsProfLoading(true);
    try {
      const data = await professionService.getProfessions(search);
      setProfessions(data);
    } catch (error) {
      console.error("Failed to fetch professions", error);
    } finally {
      setIsProfLoading(false);
    }
  }, []);

  const handleRegionSearch = useCallback(async (search: string) => {
    if (!authService.isAuthenticated()) return;
    setIsRegionLoading(true);
    try {
      const data = await regionService.getRegions(search);
      setRegions(data);
    } catch (error) {
      console.error("Failed to fetch regions", error);
    } finally {
      setIsRegionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    // Only fetch from API when viewing "all" items (not mine/saved which are client-filtered)
    if (activeSubTab !== "all" && activeSubTab !== "mine") return;
    const fetchFilters: any = { status: ItemStatus.ACTIVE };
    if (filters.profession) {
      const profValue = String(filters.profession);
      if (profValue.startsWith('cat_')) {
        // Category-based filter: send category_id to backend
        fetchFilters.category_id = parseInt(profValue.replace('cat_', ''));
      } else {
        fetchFilters.profession_id = parseInt(profValue);
      }
    }
    if (filters.region) fetchFilters.region_id = parseInt(filters.region);
    if (filters.gender !== "all") fetchFilters.gender = filters.gender;
    if (filters.age_range) fetchFilters.age_range = filters.age_range;
    if (filters.salary_range) fetchFilters.salary_range = filters.salary_range;
    if (filters.work_format) fetchFilters.work_format = filters.work_format;
    if (filters.work_type) fetchFilters.work_type = filters.work_type;
    if (filters.experience) fetchFilters.experience = filters.experience;
    if (filters.search) fetchFilters.search = filters.search;

    if (activeSection === "workers" && onFetchResumes) {
      onFetchResumes(fetchFilters);
    } else if (activeSection === "vacancies" && onFetchVacancies) {
      onFetchVacancies(fetchFilters);
    } else if (activeSection === "daily-workers" && onFetchDailyJobSeekers) {
      onFetchDailyJobSeekers(fetchFilters);
    }
  }, [
    filters,
    activeSection,
    activeSubTab,
    onFetchResumes,
    onFetchVacancies,
    onFetchDailyJobSeekers,
  ]);

  const isCandidate = initialRole === UserRole.JOB_SEEKER;
  const isDailyJobSeeker = initialRole === UserRole.DAILY_JOB_SEEKER;

  const handleRoleSelect = async (selectedRole: UserRole) => {
    if (selectedRole === initialRole) {
      setIsRoleModalOpen(false);
      return;
    }
    setIsRoleSaving(true);
    // Try to save to server if authenticated, but don't block on failure
    if (authService.isAuthenticated()) {
      try {
        await authService.updateRole(selectedRole);
      } catch (e) {
        console.warn('Could not save role to server:', e);
      }
    }
    setIsRoleModalOpen(false);
    setIsRoleSaving(false);
    onRoleChange(selectedRole);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === "v") onDeleteVacancy(Number(deleteTarget.id));
      else if (deleteTarget.type === "r")
        onDeleteResume(Number(deleteTarget.id));
      else onDeleteDailyJobSeeker?.(Number(deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    setIsLangModalOpen(false);
  };

  const filteredItems = useMemo(() => {
    let list: any[] = [];

    if (activeSection === "vacancies") {
      if (activeSubTab === "all" || activeSubTab === "mine") {
        // Both home and browse show all active vacancies
        list = vacancies.filter((v) => v.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "saved") {
        list = vacancies.filter(
          (v) => savedIds.includes(v.id) && (v.status === ItemStatus.ACTIVE || v.status === ItemStatus.ARCHIVED),
        );
      }
    } else if (activeSection === "workers") {
      if (activeSubTab === "all" || activeSubTab === "mine") {
        list = resumes.filter((r) => r.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "saved") {
        list = resumes.filter(
          (r) => savedIds.includes(r.id) && (r.status === ItemStatus.ACTIVE || r.status === ItemStatus.ARCHIVED),
        );
      }
    } else if (activeSection === "daily-workers") {
      if (activeSubTab === "all" || activeSubTab === "mine") {
        list = dailyJobSeekers.filter((r) => r.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "saved") {
        list = dailyJobSeekers.filter(
          (r) => savedDailyJobSeekerIds.includes(r.id) && (r.status === ItemStatus.ACTIVE || r.status === ItemStatus.ARCHIVED),
        );
      }
    }

    // Apply search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter((item: any) => {
        const name = item.company_name || `${item.first_name} ${item.last_name}` || "";
        const profName = getLocalizedName(item.profession) || "";
        return name.toLowerCase().includes(q) || profName.toLowerCase().includes(q);
      });
    }

    return list;
  }, [
    activeSection,
    activeSubTab,
    vacancies,
    resumes,
    dailyJobSeekers,
    savedIds,
    savedDailyJobSeekerIds,
    currentUser,
    searchText,
    getLocalizedName,
  ]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredItems.slice(start, start + perPage);
  }, [filteredItems, page]);

  useEffect(() => {
    const mainContainer = document.getElementById("main-scroll-container");
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page, activeSection]);

  const activeFilterCount = [
    filters.profession,
    filters.region,
    filters.gender !== "all" ? filters.gender : "",
    filters.age_range,
    filters.salary_range,
    filters.work_format,
    filters.work_type,
    filters.experience,
    filters.search,
  ].filter(Boolean).length;

  const handleEmptyStateAction = () => {
    // Always clear filters first if there are active filters
    if (activeFilterCount > 0) {
      setFilters({
        profession: "",
        region: "",
        gender: "all",
        age_range: "",
        salary_range: "",
        work_format: "",
        work_type: "",
        experience: "",
        search: "",
      });
      return;
    }
    if (activeSubTab === "mine") {
      if (activeSection === "vacancies") onAddVacancy();
      else onAddResume();
      return;
    }
    if (activeSubTab === "saved") {
      setActiveSubTab("all");
      return;
    }
    setIsFilterModalOpen(true);
  };

  // ─── HOME TAB (all) - Main Page Design ──────────────────────────────────────
  const renderHomePage = () => (
    <div className="space-y-5 px-4 pt-4 pb-4 fade-up">
      {/* Greeting Banner with 3D character */}
      <div className="relative rounded-3xl mt-8">
        {/* Banner card (clips decorative circles) */}
        <div className="relative overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 40%, #818CF8 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-6 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />

          <div className="flex items-center p-5 relative z-10">
            <div className="flex-1 pr-2">
              <p className="text-white/80 text-sm font-medium mb-1">
                {t("home.greeting", { name: currentUser?.first_name || t("home.user") })}
              </p>
              <h2 className="text-[17px] font-bold leading-tight mb-3 text-white">
                {initialRole === UserRole.CANDIDATE_HUNTER 
                  ? "🤖 AI sizga mos ishchi topdi!"
                  : "🤖 AI sizga mos ish topdi!"}
              </h2>
              <button
                onClick={() => setActiveSubTab("mine")}
                className="bg-white/95 text-indigo-700 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg"
              >
                <i className="fa-solid fa-robot text-sm" />
                {initialRole === UserRole.CANDIDATE_HUNTER 
                  ? "Mos ishchilarni ko'rish"
                  : "Mos vakansiyalarni ko'rish"}
                <i className="fa-solid fa-chevron-right text-[9px]" />
              </button>
            </div>
            {/* Spacer reserving room for the overlapping character */}
            <div className="w-32 shrink-0" />
          </div>
        </div>

        {/* 3D Character - bottom aligned with banner, head pokes out the top */}
        <img
          src="/vecteezy_distinctive-classic-concept-art-style-hyper-specific_60499717.png"
          alt="3D character illustration"
          className="absolute right-2 bottom-0 w-40 h-52 object-contain object-bottom z-20 pointer-events-none select-none drop-shadow-2xl"
        />
      </div>

      {/* Stats Row - informational, non-clickable */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { icon: "workers" as const, value: "8 300+", labelKey: "home.stats.workers", emoji: "\ud83d\udc65" },
          { icon: "employers" as const, value: "1 250+", labelKey: "home.stats.employers", emoji: "\ud83d\udcbc" },
          { icon: "vacancies" as const, value: "5 420+", labelKey: "home.stats.active_vacancies", emoji: "\ud83d\ude97" },
          { icon: "time" as const, value: `1 ${t("home.stats.minute")}`, labelKey: "home.stats.post_time", emoji: "\u23f0" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-muted)' }}>
            <div className="flex items-center justify-center mb-1.5">
              <Icon3D name={stat.icon} size={36} fallbackEmoji={stat.emoji} />
            </div>
            <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            <p className="text-[8px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{t(stat.labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { icon: "rocket" as const, labelKey: "home.quick.find_fast", emoji: "\ud83d\ude80", action: () => setActiveSubTab("mine") },
          { icon: "briefcase" as const, labelKey: "home.quick.daily_jobs", emoji: "\ud83d\udcbc", action: () => { setActiveSection("daily-workers"); setActiveSubTab("mine"); } },
          { icon: "fire" as const, labelKey: "home.quick.new", emoji: "\ud83d\udd25", action: () => setActiveSubTab("mine") },
          { icon: "bookmark" as const, labelKey: "home.quick.saved", emoji: "\ud83d\udd16", action: () => setActiveSubTab("saved") },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
          >
            <Icon3D name={item.icon} size={32} fallbackEmoji={item.emoji} />
            <p className="text-[9px] font-bold leading-tight text-center" style={{ color: 'var(--text-secondary)' }}>{t(item.labelKey)}</p>
          </button>
        ))}
      </div>

      {/* Categories from backend - only parent professions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t("home.categories")}</h3>
          <button onClick={() => setShowAllCategories(true)} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{t("home.all")} <i className="fa-solid fa-chevron-right text-[8px]" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {professions.filter(p => !p.parent_id).slice(0, 14).map((prof) => {
            const iconInfo = getProfessionIcon(prof);
            return (
              <button
                key={prof.id}
                onClick={() => {
                  setFilters({ ...filters, profession: String(prof.id) });
                  setActiveSubTab("mine");
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${iconInfo.color}15` }}>
                  <i className={`fa-solid ${iconInfo.icon} text-lg`} style={{ color: iconInfo.color }} />
                </div>
                <span className="text-[9px] font-bold text-center leading-tight line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{getLocalizedName(prof)}</span>
              </button>
            );
          })}
          {/* "Boshqa" button */}
          <button
            onClick={() => setShowAllCategories(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' + '15' }}>
              <i className="fa-solid fa-grip text-lg" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[9px] font-bold text-center leading-tight" style={{ color: 'var(--accent)' }}>{t("home.more")}</span>
          </button>
        </div>
      </div>

      {/* Recommendations - role-based */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t("home.recommendations")}</h3>
          <button
            onClick={() => setActiveSubTab("mine")}
            className="text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            {t("home.all")}
          </button>
        </div>
        <div className="space-y-3">
          {initialRole === UserRole.CANDIDATE_HUNTER ? (
            // Ish beruvchi uchun — ishchilar (rezumelar) ko'rinadi
            <>
              {resumes.filter(r => r.status === ItemStatus.ACTIVE).slice(0, 3).map((resume, i) => (
                <ClientResumeExplorerCard
                  key={resume.id}
                  resume={resume}
                  isSaved={savedIds.includes(resume.id)}
                  onToggleSave={onToggleResumeSave}
                  index={i}
                />
              ))}
              {resumes.filter(r => r.status === ItemStatus.ACTIVE).length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-muted)' }}>
                    <i className="fa-solid fa-users text-xl" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t("home.no_workers") || "Ishchilar topilmadi"}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t("home.no_workers_hint") || "Tez orada yangi ishchilar paydo bo'ladi"}</p>
                </div>
              )}
            </>
          ) : (
            // Ishchi/Kunlik ishchi uchun — vakansiyalar ko'rinadi
            <>
              {vacancies.filter(v => v.status === ItemStatus.ACTIVE).slice(0, 3).map((vacancy, i) => (
                <ClientVacancyExplorerCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  isSaved={savedIds.includes(vacancy.id)}
                  onToggleSave={
                    initialRole === UserRole.JOB_SEEKER
                      ? onToggleVacancySave
                      : undefined
                  }
                  index={i}
                />
              ))}
              {vacancies.filter(v => v.status === ItemStatus.ACTIVE).length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-muted)' }}>
                    <i className="fa-solid fa-briefcase text-xl" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t("home.no_vacancies")}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t("home.no_vacancies_hint")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ─── VACANCIES TAB (mine) - Vacancies List Design ───────────────────────────
  // Foydalanuvchining o'z e'lonlari
  const myItems = useMemo(() => {
    if (!currentUser) return [];
    if (activeSection === "vacancies") {
      return vacancies.filter((v) => v.user_id === Number(currentUser.id));
    } else if (activeSection === "workers") {
      return resumes.filter((r) => r.user_id === Number(currentUser.id));
    } else {
      return dailyJobSeekers.filter((r) => r.user_id === Number(currentUser.id));
    }
  }, [activeSection, vacancies, resumes, dailyJobSeekers, currentUser]);

  const renderVacanciesList = () => (
    <div className="space-y-4 px-4 pt-4 pb-4 fade-up">
      {/* ─── My Own Items Section ──────────────────────────────────── */}
      {myItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-folder-open text-sm mr-2" style={{ color: 'var(--accent)' }} />
              {activeSection === "vacancies" 
                ? t("client_panel.my_vacancies") || "Mening vakansiyalarim"
                : activeSection === "workers"
                  ? t("client_panel.my_resumes") || "Mening rezumelarim"
                  : t("client_panel.my_daily_posts") || "Mening e'lonlarim"}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--accent)' + '15', color: 'var(--accent)' }}>
              {myItems.length} ta
            </span>
          </div>

          <div className="space-y-3">
            {myItems.map((item: any, i: number) => {
              const isVacancy = "company_name" in item;
              if (isVacancy) {
                return (
                  <ClientVacancyOwnerCard
                    key={`my-${item.id}`}
                    vacancy={item}
                    onEdit={onEditVacancy}
                    onDelete={(id) => setDeleteTarget({ id, type: "v" })}
                    index={i}
                  />
                );
              }
              return (
                <ClientResumeOwnerCard
                  key={`my-${item.id}`}
                  resume={item}
                  onEdit={activeSection === "daily-workers" ? (onEditDailyJobSeeker as any) : onEditResume}
                  onDelete={(id) => setDeleteTarget({ id, type: activeSection === "daily-workers" ? "d" : "r" })}
                  index={i}
                />
              );
            })}
          </div>

          {/* Divider between my items and public items */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-primary)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {activeSection === "vacancies" 
                ? t("client_panel.all_vacancies") || "Barcha vakansiyalar"
                : activeSection === "workers"
                  ? t("client_panel.all_resumes") || "Barcha rezumelar"
                  : t("client_panel.all_daily") || "Barcha e'lonlar"}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-primary)' }} />
          </div>
        </div>
      )}

      {/* Add button - always shows user's own content creation based on role */}
      {initialRole === UserRole.CANDIDATE_HUNTER && (
        <button
          onClick={onAddVacancy}
          className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-indigo-100"
        >
          <i className="fa-solid fa-plus text-sm" />
          {t("client_panel.post_vacancy")}
        </button>
      )}
      {initialRole === UserRole.JOB_SEEKER && (
        <button
          onClick={onAddResume}
          className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-blue-100"
        >
          <i className="fa-solid fa-plus text-sm" />
          {t("client_forms.create")} {t("common.resume")}
        </button>
      )}
      {initialRole === UserRole.DAILY_JOB_SEEKER && (
        <button
          onClick={onAddResume}
          className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-emerald-100"
        >
          <i className="fa-solid fa-plus text-sm" />
          {t("client_forms.create")} {t("nav.daily_workers")}
        </button>
      )}

      {/* Search bar */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder={activeSection === "vacancies" ? t("client_panel.search_vacancy") : t("client_panel.search_worker")}
          className="w-full pl-11 pr-24 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Voice Search Button */}
          <VoiceSearchButton onResult={(text) => { setSearchText(text); setPage(1); }} />
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500"
          >
            <i className="fa-solid fa-sliders text-xs" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: t("filters.chips.all") },
          { key: "new", label: t("filters.chips.new") },
          { key: "onsite", label: t("filters.chips.onsite") },
          { key: "remote", label: t("filters.chips.remote") },
          { key: "short_term", label: t("filters.chips.short_term") },
        ].map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilterChip(chip.key)}
            className={`filter-chip whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeFilterChip === chip.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* AI Search Results (Google-style) */}
      {searchText.trim().length >= 3 && (
        <AISearchResults searchText={searchText} userRole={initialRole} />
      )}

      {/* Vacancy/Resume list */}
      <div className="space-y-3">
        {isNavigating ? (
          <SkeletonList count={perPage} />
        ) : (
          <>
            {pagedItems.map((item: any, i: number) => {
              const isVacancy = "company_name" in item;

              // Insert HH vacancy after every 3rd item
              const hhInsert = (activeSection === "vacancies" && i > 0 && i % 3 === 0 && hhVacancies.length > 0)
                ? hhVacancies[Math.floor(i / 3) - 1] || null
                : null;

              return (
                <React.Fragment key={item.id}>
                  {hhInsert && <HHVacancyCard vacancy={hhInsert} />}
                  {isVacancy ? (
                    item.user_id === currentUser?.id ? (
                      <ClientVacancyOwnerCard
                        vacancy={item}
                        onEdit={onEditVacancy}
                        onDelete={(id) => setDeleteTarget({ id, type: "v" })}
                        index={i}
                      />
                    ) : (
                      <ClientVacancyExplorerCard
                        vacancy={item}
                        isSaved={savedIds.includes(item.id)}
                        onToggleSave={
                          initialRole === UserRole.CANDIDATE_HUNTER
                            ? onToggleVacancySave
                            : undefined
                        }
                        index={i}
                      />
                    )
                  ) : (
                    item.user_id === currentUser?.id ? (
                      <ClientResumeOwnerCard
                        resume={item}
                        onEdit={activeSection === "daily-workers" ? (onEditDailyJobSeeker as any) : onEditResume}
                        onDelete={(id) => setDeleteTarget({ id, type: activeSection === "daily-workers" ? "d" : "r" })}
                        index={i}
                      />
                    ) : (
                      <ClientResumeExplorerCard
                        resume={item}
                        isSaved={
                          activeSection === "daily-workers"
                            ? savedDailyJobSeekerIds.includes(item.id)
                            : savedIds.includes(item.id)
                        }
                        onToggleSave={
                          activeSection === "daily-workers"
                            ? (initialRole === UserRole.DAILY_JOB_SEEKER ? onToggleDailyJobSeekerSave : undefined)
                            : (initialRole === UserRole.JOB_SEEKER ? onToggleResumeSave : undefined)
                        }
                        index={i}
                      />
                    )
                  )}
                </React.Fragment>
              );
            })}

            <Pagination
              current={page}
              total={filteredItems.length}
              perPage={perPage}
              onChange={setPage}
            />

            {filteredItems.length === 0 && (
              <div className="py-16 text-center fade-up">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-magnifying-glass text-2xl text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400 mb-1">
                  {t("client_panel.empty_title")}
                </p>
                <p className="text-xs text-slate-300">
                  {t("client_panel.empty_subtitle")}
                </p>
                <button
                  onClick={() => {
                    if (initialRole === UserRole.CANDIDATE_HUNTER) {
                      onAddVacancy();
                    } else {
                      onAddResume();
                    }
                  }}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  {initialRole === UserRole.CANDIDATE_HUNTER
                    ? t("client_panel.post_vacancy")
                    : t("client_forms.create") + " " + t("common.resume")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ─── SAVED TAB ──────────────────────────────────────────────────────────────
  const renderSavedList = () => (
    <div className="space-y-4 px-4 pt-4 pb-4 fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{t("nav.saved")}</h2>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {filteredItems.length} ta
        </span>
      </div>

      <div className="space-y-3">
        {isNavigating ? (
          <SkeletonList count={perPage} />
        ) : (
          <>
            {pagedItems.map((item: any, i: number) => {
              const isVacancy = "company_name" in item;
              if (isVacancy) {
                return (
                  <ClientVacancyExplorerCard
                    key={item.id}
                    vacancy={item}
                    isSaved={savedIds.includes(item.id)}
                    onToggleSave={
                      initialRole === UserRole.CANDIDATE_HUNTER
                        ? onToggleVacancySave
                        : undefined
                    }
                    index={i}
                  />
                );
              }
              return (
                <ClientResumeExplorerCard
                  key={item.id}
                  resume={item}
                  isSaved={
                    activeSection === "daily-workers"
                      ? savedDailyJobSeekerIds.includes(item.id)
                      : savedIds.includes(item.id)
                  }
                  onToggleSave={
                    activeSection === "daily-workers"
                      ? (initialRole === UserRole.DAILY_JOB_SEEKER ? onToggleDailyJobSeekerSave : undefined)
                      : (initialRole === UserRole.JOB_SEEKER ? onToggleResumeSave : undefined)
                  }
                  index={i}
                />
              );
            })}

            {filteredItems.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <i className="fa-solid fa-bookmark text-xl" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{t("saved.empty")}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t("saved.empty_hint")}</p>
              </div>
            )}

            <Pagination
              current={page}
              total={filteredItems.length}
              perPage={perPage}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );

  // ─── PROFILE/MORE TAB ───────────────────────────────────────────────────────
  const renderProfilePage = () => (
    <div className="space-y-4 px-4 pt-4 pb-4 fade-up">
      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 text-center card-shadow border border-slate-50">
        <div className="relative inline-block mx-auto mb-3">
          {currentUser?.photo_url && currentUser.photo_url.trim() !== "" ? (
            <img
              src={currentUser.photo_url}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-3 border-indigo-100 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-lg">
              <i className="fa-solid fa-user" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {currentUser?.first_name} {currentUser?.last_name}
        </h2>
        {currentUser?.username && (
          <p className="text-sm text-indigo-600 font-medium mt-0.5">
            @{currentUser.username}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {isCandidate ? t("role.candidate") : isDailyJobSeeker ? t("role.daily_job_seeker") : t("role.partner")}
        </p>
      </div>

      {/* ─── My Posts Management ─────────────────────────────────────── */}
      <div className="rounded-2xl p-4 card-shadow border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-folder-open mr-1.5" style={{ color: 'var(--accent)' }} />
            {initialRole === UserRole.CANDIDATE_HUNTER ? "Mening vakansiyalarim" : "Mening e'lonlarim"}
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
            {(initialRole === UserRole.CANDIDATE_HUNTER
              ? vacancies.filter(v => v.user_id === Number(currentUser?.id))
              : initialRole === UserRole.DAILY_JOB_SEEKER
                ? dailyJobSeekers.filter(d => d.user_id === Number(currentUser?.id))
                : resumes.filter(r => r.user_id === Number(currentUser?.id))
            ).length} ta
          </span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(() => {
            const myPosts: any[] = initialRole === UserRole.CANDIDATE_HUNTER
              ? vacancies.filter(v => v.user_id === Number(currentUser?.id))
              : initialRole === UserRole.DAILY_JOB_SEEKER
                ? dailyJobSeekers.filter(d => d.user_id === Number(currentUser?.id))
                : resumes.filter(r => r.user_id === Number(currentUser?.id));
            if (myPosts.length === 0) {
              return (
                <div className="text-center py-6">
                  <i className="fa-solid fa-inbox text-2xl mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Hali e'lon joylamagansiz</p>
                  <button onClick={() => initialRole === UserRole.CANDIDATE_HUNTER ? onAddVacancy() : onAddResume()}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                    style={{ backgroundColor: 'var(--accent)' }}>
                    <i className="fa-solid fa-plus mr-1" />Yangi qo'shish
                  </button>
                </div>
              );
            }
            return myPosts.map((item: any) => {
              const isVacancy = "company_name" in item;
              const statusColor = item.status === "active" ? "#16a34a" : item.status === "archived" ? "#f59e0b" : "#6b7280";
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-muted)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: statusColor + '15' }}>
                    <i className={`fa-solid ${isVacancy ? 'fa-briefcase' : 'fa-user'} text-sm`} style={{ color: statusColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {isVacancy ? item.company_name : `${item.first_name} ${item.last_name}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                        {item.status === "active" ? "Aktiv" : item.status === "archived" ? "Arxiv" : "Qoralama"}
                      </span>
                      <span className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-eye text-[7px]" /> {item.viewed_count || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => isVacancy ? onEditVacancy(item) : onEditResume(item)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                      style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                      <i className="fa-solid fa-pen text-[10px]" />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: item.id, type: isVacancy ? "v" : "r" })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all bg-red-50 text-red-400">
                      <i className="fa-solid fa-trash text-[10px]" />
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Section Switcher - role-based sections */}
      <div className="bg-white rounded-2xl p-4 card-shadow border border-slate-50">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
          {t("client_panel.sections")}
        </p>
        <div className={`grid gap-2 ${
          initialRole === UserRole.CANDIDATE_HUNTER ? "grid-cols-2" : "grid-cols-2"
        }`}>
          {(() => {
            // Rolega qarab foydalanuvchiga mos bo'limlarni ko'rsatamiz
            const sections: Array<{ id: "vacancies" | "workers" | "daily-workers"; label: string; icon: string }> = [];
            
            if (initialRole === UserRole.CANDIDATE_HUNTER) {
              // Ish beruvchi: Ishchilar va Kunlik ishchilarni ko'radi (o'zi vakansiya beradi)
              sections.push({ id: "workers", label: t("nav.workers") || "Ishchilar", icon: "fa-users" });
              sections.push({ id: "daily-workers", label: t("nav.daily_workers"), icon: "fa-people-group" });
            } else if (initialRole === UserRole.JOB_SEEKER) {
              // Ishchi: Vakansiyalar va Kunlik ishlarni ko'radi (o'zi rezume yaratadi)
              sections.push({ id: "vacancies", label: t("nav.vacancies"), icon: "fa-briefcase" });
              sections.push({ id: "daily-workers", label: t("nav.daily_workers"), icon: "fa-people-group" });
            } else {
              // Kunlik ishchi: Vakansiyalar va Ishchilarni ko'radi
              sections.push({ id: "vacancies", label: t("nav.vacancies"), icon: "fa-briefcase" });
              sections.push({ id: "workers", label: t("nav.workers") || "Ishchilar", icon: "fa-users" });
            }
            
            return sections.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setActiveSubTab("mine"); setPage(1); }}
                className={`py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all flex flex-col items-center gap-1.5 active:scale-95 ${
                  activeSection === s.id
                    ? "bg-indigo-600 text-white border-transparent shadow-md"
                    : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                }`}
              >
                <i className={`fa-solid ${s.icon} text-base`} />
                {s.label}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-50 overflow-hidden">
        <button
          onClick={() => setIsRoleModalOpen(true)}
          className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors active:scale-[0.98] border-b border-slate-50"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i className="fa-solid fa-repeat text-sm" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-800">{t("client_panel.context")}</p>
            <p className="text-xs text-slate-400">{t("client_panel.role_switch")}</p>
          </div>
          <i className="fa-solid fa-chevron-right text-xs text-slate-300" />
        </button>

        <button
          onClick={() => setIsLangModalOpen(true)}
          className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <i className="fa-solid fa-globe text-sm" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-800">{t("client_panel.localization")}</p>
            <p className="text-xs text-slate-400">
              {LANGUAGES.find((l) => l.code === currentLang)?.name || currentLang}
            </p>
          </div>
          <i className="fa-solid fa-chevron-right text-xs text-slate-300" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3.5 bg-white rounded-2xl border border-red-100 text-red-500 font-bold text-sm flex justify-center items-center gap-2 active:scale-[0.97] transition-all hover:bg-red-50 card-shadow"
      >
        <i className="fa-solid fa-right-from-bracket text-sm" />
        {t("client_panel.terminate")}
      </button>
    </div>
  );

  // + tugmasi bosilganda — foydalanuvchi o'z kontentini yaratadi
  const handlePlusPress = () => {
    if (initialRole === UserRole.CANDIDATE_HUNTER) {
      onAddVacancy(); // Ish beruvchi vakansiya yaratadi
    } else if (initialRole === UserRole.DAILY_JOB_SEEKER) {
      onAddResume(); // Kunlik ishchi e'lon yaratadi
    } else {
      onAddResume(); // Ishchi rezume yaratadi
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      activeSubTab={activeSubTab}
      onSubTabChange={(tab) => {
        if (tab !== activeSubTab) {
          setIsNavigating(true);
          setActiveSubTab(tab);
          setPage(1);
          setSearchText("");
          setTimeout(() => setIsNavigating(false), 300);
        }
      }}
      onPlusPress={handlePlusPress}
      role={initialRole}
      onToggleRole={() => setIsRoleModalOpen(true)}
      savedCount={activeSection === "daily-workers" ? savedDailyJobSeekerIds.length : savedIds.length}
    >
      {/* Deep-link detail as main content (navbar stays, back returns home) */}
      {(deepLinkItem || deepLinkLoading) ? (
        <div className="px-4 pt-4 pb-4 fade-up">
          <button
            onClick={() => { setDeepLinkItem(null); setActiveSubTab("all"); }}
            className="flex items-center gap-2 mb-4 text-sm font-semibold active:scale-95 transition-all"
            style={{ color: 'var(--accent)' }}
          >
            <i className="fa-solid fa-arrow-left" /> Bosh menyuga qaytish
          </button>
          {deepLinkLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
            </div>
          ) : deepLinkItem?.kind === "vacancy" ? (
            <ClientVacancyExplorerCard
              vacancy={deepLinkItem.data}
              isSaved={savedIds.includes(deepLinkItem.data.id)}
              onToggleSave={initialRole === UserRole.JOB_SEEKER ? onToggleVacancySave : undefined}
              index={0}
            />
          ) : deepLinkItem?.kind === "resume" ? (
            <ClientResumeExplorerCard
              resume={deepLinkItem.data}
              isSaved={savedIds.includes(deepLinkItem.data.id)}
              onToggleSave={initialRole === UserRole.CANDIDATE_HUNTER ? onToggleResumeSave : undefined}
              index={0}
            />
          ) : null}
        </div>
      ) : (
        <>
          {activeSubTab === "all" && renderHomePage()}
          {activeSubTab === "mine" && renderVacanciesList()}
          {activeSubTab === "saved" && renderSavedList()}
          {activeSubTab === "more" && renderProfilePage()}
        </>
      )}

      {/* All Categories Modal - 2 columns, parent with child list */}
      {showAllCategories && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex flex-col">
          <div className="bg-white w-full max-w-md mx-auto mt-auto rounded-t-3xl flex flex-col max-h-[90vh] slide-up-modal" style={{ backgroundColor: 'var(--bg-card)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t("home.categories")}</h3>
              <button
                onClick={() => setShowAllCategories(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            {/* Scrollable - Parent categories with full child lists */}
            <div className="overflow-y-auto px-5 py-4 flex-1">
              {/* Kasblar section */}
              {professions.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-briefcase text-indigo-500" />
                    {t("home.professions_block")}
                  </h4>
                  <div className="space-y-3">
                    {professions.filter(p => !p.parent_id).map(parent => {
                      const children = professions.filter(c => c.parent_id === parent.id);
                      const iconInfo = getProfessionIcon(parent);
                      return (
                        <div key={parent.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
                          {/* Parent header - clickable */}
                          <button
                            onClick={() => {
                              setFilters({ ...filters, profession: `cat_${parent.id}` });
                              setShowAllCategories(false);
                              setActiveSubTab("mine");
                            }}
                            className="flex items-center gap-3 w-full active:scale-[0.98] transition-all"
                          >
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${iconInfo.color}15` }}>
                              <i className={`fa-solid ${iconInfo.icon} text-base`} style={{ color: iconInfo.color }} />
                            </div>
                            <div className="flex-1 text-left">
                              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getLocalizedName(parent)}</span>
                              {children.length > 0 && (
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{children.length} ta yo'nalish</p>
                              )}
                            </div>
                            <i className="fa-solid fa-chevron-right text-[10px]" style={{ color: 'var(--text-muted)' }} />
                          </button>
                          {/* All children - full list */}
                          {children.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5" style={{ borderColor: 'var(--border-primary)' }}>
                              {children.map(child => (
                                <button
                                  key={child.id}
                                  onClick={() => {
                                    setFilters({ ...filters, profession: String(child.id) });
                                    setShowAllCategories(false);
                                    setActiveSubTab("mine");
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 border"
                                  style={{ borderColor: `${iconInfo.color}30`, color: iconInfo.color, backgroundColor: `${iconInfo.color}08` }}
                                >
                                  {getLocalizedName(child)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ish turlari section */}
              {works.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-hammer text-amber-500" />
                    {t("home.works_block")}
                  </h4>
                  <div className="space-y-3">
                    {works.filter(w => !w.parent_id).map(parent => {
                      const children = works.filter(c => c.parent_id === parent.id);
                      const iconInfo = getProfessionIcon(parent);
                      return (
                        <div key={parent.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${iconInfo.color}15` }}>
                              <i className={`fa-solid ${iconInfo.icon} text-base`} style={{ color: iconInfo.color }} />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getLocalizedName(parent)}</span>
                              {children.length > 0 && (
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{children.length} ta turi</p>
                              )}
                            </div>
                          </div>
                          {children.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5" style={{ borderColor: 'var(--border-primary)' }}>
                              {children.map(child => (
                                <span key={child.id} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
                                  style={{ borderColor: `${iconInfo.color}30`, color: iconInfo.color, backgroundColor: `${iconInfo.color}08` }}>
                                  {getLocalizedName(child)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {professions.length === 0 && works.length === 0 && (
                <div className="py-12 text-center">
                  <i className="fa-solid fa-folder-open text-3xl mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t("home.categories_empty")}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role Modal */}
      {isRoleModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 pb-10 slide-up-modal">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{t("client_panel.select_role")}</h3>
            <div className="space-y-3">
              {[
                { role: UserRole.JOB_SEEKER, label: t("role.candidate"), icon: "fa-user-graduate", color: "bg-blue-50 text-blue-600" },
                { role: UserRole.CANDIDATE_HUNTER, label: t("role.partner"), icon: "fa-user-tie", color: "bg-indigo-50 text-indigo-600" },
                { role: UserRole.DAILY_JOB_SEEKER, label: t("role.daily_job_seeker"), icon: "fa-calendar-day", color: "bg-emerald-50 text-emerald-600" },
              ].map((r) => (
                <button
                  key={r.role}
                  onClick={() => handleRoleSelect(r.role)}
                  disabled={isRoleSaving}
                  className={`w-full p-4 rounded-2xl flex items-center gap-4 border-2 transition-all active:scale-[0.97] ${
                    initialRole === r.role
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-slate-100 hover:border-indigo-100"
                  } ${isRoleSaving ? "opacity-50" : ""}`}
                >
                  <div className={`w-11 h-11 rounded-xl ${r.color} flex items-center justify-center`}>
                    <i className={`fa-solid ${r.icon} text-lg`} />
                  </div>
                  <span className="font-bold text-slate-800">{r.label}</span>
                  {initialRole === r.role && (
                    <i className="fa-solid fa-check text-indigo-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsRoleModalOpen(false)}
              className="w-full mt-4 py-3 text-slate-500 font-semibold text-sm"
            >
              {t("client_panel.cancel")}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Language Modal */}
      {isLangModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 pb-10 slide-up-modal">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{t("client_panel.select_language")}</h3>
            <div className="space-y-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
                  className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${
                    currentLang === l.code
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-slate-100 hover:border-indigo-100"
                  }`}
                >
                  <span className="font-semibold text-slate-800">{l.name}</span>
                  {currentLang === l.code && (
                    <i className="fa-solid fa-check text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsLangModalOpen(false)}
              className="w-full mt-4 py-3 text-slate-500 font-semibold text-sm"
            >
              {t("client_panel.cancel")}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <FilterModal
          filters={filters}
          setFilters={setFilters}
          onClose={() => setIsFilterModalOpen(false)}
          professions={professions}
          regions={regions}
          isProfLoading={isProfLoading}
          isRegionLoading={isRegionLoading}
          onProfessionSearch={handleProfessionSearch}
          onRegionSearch={handleRegionSearch}
          activeSection={activeSection}
          userRole={initialRole}
          onCreateItem={() => {
            if (initialRole === UserRole.CANDIDATE_HUNTER) {
              onAddVacancy();
            } else {
              onAddResume();
            }
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title={t("client_panel.delete_confirm", { type: deleteTarget.type === "v" ? t("common.vacancy") : t("common.resume") })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
};

export default ClientPanel;
