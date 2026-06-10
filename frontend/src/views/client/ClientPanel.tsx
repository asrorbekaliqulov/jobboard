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

interface ClientPanelProps {
  initialRole: UserRole;
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
    if (role === UserRole.DAILY_JOB_SEEKER) return "daily-workers";
    if (role === UserRole.JOB_SEEKER) return "workers";
    return "vacancies";
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
  const [regions, setRegions] = useState<Region[]>([]);
  const [isProfLoading, setIsProfLoading] = useState(false);
  const [isRegionLoading, setIsRegionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string | number;
    type: "v" | "r" | "d";
  } | null>(null);

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
    if (activeSubTab !== "all") return;
    if (!authService.isAuthenticated()) return;
    const fetchFilters: any = { status: ItemStatus.ACTIVE };
    if (filters.profession)
      fetchFilters.profession_id = parseInt(filters.profession);
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
      if (activeSubTab === "all") {
        list = vacancies.filter((v) => v.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "mine") {
        list = vacancies.filter((v) => v.user_id === currentUser?.id && v.status !== ItemStatus.DELETED);
      } else if (activeSubTab === "saved") {
        list = vacancies.filter(
          (v) => savedIds.includes(v.id) && (v.status === ItemStatus.ACTIVE || v.status === ItemStatus.ARCHIVED),
        );
      }
    } else if (activeSection === "workers") {
      if (activeSubTab === "all") {
        list = resumes.filter((r) => r.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "mine") {
        list = resumes.filter((r) => r.user_id === currentUser?.id && r.status !== ItemStatus.DELETED);
      } else if (activeSubTab === "saved") {
        list = resumes.filter(
          (r) => savedIds.includes(r.id) && (r.status === ItemStatus.ACTIVE || r.status === ItemStatus.ARCHIVED),
        );
      }
    } else if (activeSection === "daily-workers") {
      if (activeSubTab === "all") {
        list = dailyJobSeekers.filter((r) => r.status === ItemStatus.ACTIVE);
      } else if (activeSubTab === "mine") {
        list = dailyJobSeekers.filter((r) => r.user_id === currentUser?.id && r.status !== ItemStatus.DELETED);
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

  // Categories for home page
  const categories = [
    { icon: "fa-user-doctor", labelKey: "home.cat.masters", color: "text-blue-600 bg-blue-50", professionId: "" },
    { icon: "fa-truck", labelKey: "home.cat.drivers", color: "text-red-500 bg-red-50", professionId: "" },
    { icon: "fa-helmet-safety", labelKey: "home.cat.construction", color: "text-amber-600 bg-amber-50", professionId: "" },
    { icon: "fa-laptop-code", labelKey: "home.cat.it", color: "text-indigo-600 bg-indigo-50", professionId: "" },
    { icon: "fa-shop", labelKey: "home.cat.trade", color: "text-emerald-600 bg-emerald-50", professionId: "" },
    { icon: "fa-headset", labelKey: "home.cat.service", color: "text-purple-600 bg-purple-50", professionId: "" },
    { icon: "fa-ellipsis", labelKey: "home.cat.other", color: "text-slate-600 bg-slate-100", professionId: "" },
  ];

  const handleEmptyStateAction = () => {
    if (activeSubTab === "mine") {
      if (activeSection === "vacancies") onAddVacancy();
      else onAddResume();
      return;
    }
    if (activeSubTab === "saved") {
      setActiveSubTab("all");
      return;
    }
    if (activeFilterCount > 0) {
      setFilters({ profession: "", region: "", gender: "all", age_range: "", search: "" });
      return;
    }
    setIsFilterModalOpen(true);
  };

  // ─── HOME TAB (all) - Main Page Design ──────────────────────────────────────
  const renderHomePage = () => (
    <div className="space-y-5 px-4 pt-4 pb-4 fade-up">
      {/* Greeting Banner */}
      <div className="banner-gradient p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-8 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-1">
            {t("home.greeting", { name: currentUser?.first_name || t("home.user") })}
          </p>
          <h2 className="text-lg font-bold leading-tight mb-3">
            {initialRole === UserRole.CANDIDATE_HUNTER 
              ? t("home.banner_employer") 
              : t("home.banner_title")}
          </h2>
          <button
            onClick={() => setActiveSubTab("mine")}
            className="bg-white text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            {initialRole === UserRole.CANDIDATE_HUNTER 
              ? t("home.view_workers") 
              : t("home.view_vacancies")}
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "fa-users", value: `${vacancies.length > 0 ? vacancies.length : "1"}+`, labelKey: "home.stats.workers", color: "text-indigo-600 bg-indigo-50" },
          { icon: "fa-briefcase", value: `${resumes.length > 0 ? resumes.length : "1 250"}+`, labelKey: "home.stats.employers", color: "text-emerald-600 bg-emerald-50" },
          { icon: "fa-car", value: "5 420+", labelKey: "home.stats.active_vacancies", color: "text-amber-600 bg-amber-50" },
          { icon: "fa-clock", value: `1 ${t("home.stats.minute")}`, labelKey: "home.stats.post_time", color: "text-red-500 bg-red-50" },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-3 text-center border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <i className={`fa-solid ${stat.icon} text-sm`} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{t(stat.labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t("home.categories")}</h3>
          <button className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{t("home.all")}</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => {
                setFilters({ ...filters, profession: cat.professionId || "" });
                setActiveSubTab("mine");
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
            >
              <div className={`w-11 h-11 rounded-xl ${cat.color} flex items-center justify-center`}>
                <i className={`fa-solid ${cat.icon} text-base`} />
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{t(cat.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
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
          {vacancies.filter(v => v.status === ItemStatus.ACTIVE).slice(0, 3).map((vacancy, i) => (
            <ClientVacancyExplorerCard
              key={vacancy.id}
              vacancy={vacancy}
              isSaved={savedIds.includes(vacancy.id)}
              onToggleSave={
                initialRole === UserRole.CANDIDATE_HUNTER
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
        </div>
      </div>
    </div>
  );

  // ─── VACANCIES TAB (mine) - Vacancies List Design ───────────────────────────
  const renderVacanciesList = () => (
    <div className="space-y-4 px-4 pt-4 pb-4 fade-up">
      {/* Search bar */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder="Vakansiya nomi yoki kompaniya"
          className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
        />
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500"
        >
          <i className="fa-solid fa-sliders text-xs" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Barchasi", "Yangi", "Ofis", "Masofaviy", "Qisqamuddatli"].map((chip, i) => (
          <button
            key={chip}
            onClick={() => setActiveFilterChip(i === 0 ? "all" : chip.toLowerCase())}
            className={`filter-chip whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              (i === 0 && activeFilterChip === "all") || activeFilterChip === chip.toLowerCase()
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Add button for vacancy owners */}
      {activeSection === "vacancies" && (
        <button
          onClick={onAddVacancy}
          className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-indigo-100"
        >
          <i className="fa-solid fa-plus text-sm" />
          {t("client_panel.post_vacancy")}
        </button>
      )}

      {/* Vacancy/Resume list */}
      <div className="space-y-3">
        {isNavigating ? (
          <SkeletonList count={perPage} />
        ) : (
          <>
            {pagedItems.map((item: any, i: number) => {
              const isVacancy = "company_name" in item;

              if (isVacancy) {
                if (item.user_id === currentUser?.id) {
                  return (
                    <ClientVacancyOwnerCard
                      key={item.id}
                      vacancy={item}
                      onEdit={onEditVacancy}
                      onDelete={(id) => setDeleteTarget({ id, type: "v" })}
                      index={i}
                    />
                  );
                }
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
              if (item.user_id === currentUser?.id) {
                return (
                  <ClientResumeOwnerCard
                    key={item.id}
                    resume={item}
                    onEdit={activeSection === "daily-workers" ? (onEditDailyJobSeeker as any) : onEditResume}
                    onDelete={(id) => setDeleteTarget({ id, type: activeSection === "daily-workers" ? "d" : "r" })}
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
                  Hech narsa topilmadi
                </p>
                <p className="text-xs text-slate-300">
                  Qidiruv yoki filtrlarni o'zgartiring
                </p>
                <button
                  onClick={handleEmptyStateAction}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-filter-circle-xmark text-xs" />
                  Filtrlarni tozalash
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

      {/* Section Switcher */}
      <div className="bg-white rounded-2xl p-4 card-shadow border border-slate-50">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
          Bo'limlar
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "vacancies", label: t("nav.vacancies"), icon: "fa-briefcase" },
            { id: "workers", label: t("nav.workers") || "Ishchilar", icon: "fa-users" },
            { id: "daily-workers", label: t("nav.daily_workers"), icon: "fa-people-group" },
          ] as const).map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setActiveSubTab("all"); setPage(1); }}
              className={`py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all flex flex-col items-center gap-1.5 active:scale-95 ${
                activeSection === s.id
                  ? "bg-indigo-600 text-white border-transparent shadow-md"
                  : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
              }`}
            >
              <i className={`fa-solid ${s.icon} text-base`} />
              {s.label}
            </button>
          ))}
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
            <p className="text-xs text-slate-400">Rolni almashtirish</p>
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

  // + tugmasi bosilganda
  const handlePlusPress = () => {
    if (activeSection === "vacancies" || initialRole === UserRole.CANDIDATE_HUNTER) {
      onAddVacancy();
    } else if (activeSection === "daily-workers" || initialRole === UserRole.DAILY_JOB_SEEKER) {
      onAddResume();
    } else {
      onAddResume();
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
      {activeSubTab === "all" && renderHomePage()}
      {activeSubTab === "mine" && renderVacanciesList()}
      {activeSubTab === "saved" && renderSavedList()}
      {activeSubTab === "more" && renderProfilePage()}

      {/* Role Modal */}
      {isRoleModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 pb-10 slide-up-modal">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Rolni tanlang</h3>
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
              Bekor qilish
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
            <h3 className="text-xl font-bold text-slate-900 mb-4">Tilni tanlang</h3>
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
              Bekor qilish
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
