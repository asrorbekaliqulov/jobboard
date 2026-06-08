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
  /** Maps a user role to its default section. */
  const sectionForRole = (role: UserRole): "vacancies" | "workers" | "daily-workers" => {
    if (role === UserRole.DAILY_JOB_SEEKER) return "daily-workers";
    if (role === UserRole.JOB_SEEKER) return "workers";
    return "vacancies"; // CANDIDATE_HUNTER
  };

  /** Which main section the user is browsing — defaults to the section matching their role. */
  const [activeSection, setActiveSection] = useState<"vacancies" | "workers" | "daily-workers">(
    () => sectionForRole(initialRole),
  );
  /** Sub-tab within the active section — replaces the old top inner-tab buttons. */
  const [activeSubTab, setActiveSubTab] = useState<"all" | "mine" | "saved" | "more">("all");
  const [page, setPage] = useState(1);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoleSaving, setIsRoleSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const perPage = 5;
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    profession: "",
    region: "",
    gender: "all",
    age_range: "",
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

  // Sync section/tab when initialRole prop changes (e.g. after role switch)
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

  // Fetch fresh data from API whenever exploring (activeSubTab='all') and section/filters change
  useEffect(() => {
    if (activeSubTab !== "all") return;
    const fetchFilters: any = { status: ItemStatus.ACTIVE };
    if (filters.profession)
      fetchFilters.profession_id = parseInt(filters.profession);
    if (filters.region) fetchFilters.region_id = parseInt(filters.region);
    if (filters.gender !== "all") fetchFilters.gender = filters.gender;
    if (filters.age_range) fetchFilters.age_range = filters.age_range;
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
  const accentBg = isCandidate
    ? "bg-blue-500"
    : isDailyJobSeeker
      ? "bg-emerald-500"
      : "bg-violet-500";
  const accentText = isCandidate
    ? "text-blue-500"
    : isDailyJobSeeker
      ? "text-emerald-500"
      : "text-violet-500";
  const accentGradient = isCandidate
    ? "btn-gradient"
    : isDailyJobSeeker
      ? "btn-gradient-emerald"
      : "btn-gradient-purple";

  const accentFilterTag = isCandidate
    ? "bg-blue-600 border-blue-600 shadow-blue-200"
    : isDailyJobSeeker
      ? "bg-emerald-600 border-emerald-600 shadow-emerald-200"
      : "bg-violet-600 border-violet-600 shadow-violet-200";

  const handleRoleSelect = async (selectedRole: UserRole) => {
    if (selectedRole === initialRole) {
      setIsRoleModalOpen(false);
      return;
    }
    setIsRoleSaving(true);
    const success = await authService.updateRole(selectedRole);
    if (success) {
      setIsRoleModalOpen(false);
      setIsRoleSaving(false);
      onRoleChange(selectedRole); // useEffect above handles section/tab/page reset
    } else {
      setIsRoleSaving(false);
      showToast(t("onboarding.failed_role"), 'error');
    }
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
  ]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredItems.slice(start, start + perPage);
  }, [filteredItems, page]);

  // Scroll to top when page changes or tab changes
  useEffect(() => {
    const mainContainer = document.getElementById("main-scroll-container");
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page, activeSection]);

  const getSectionLabel = useCallback(
    (section: string) => {
      switch (section) {
        case "vacancies":     return t("nav.vacancies");
        case "workers":       return t("nav.resumes");
        case "daily-workers": return t("nav.daily_workers");
        default:              return section;
      }
    },
    [t],
  );

  const activeFilterCount = [
    filters.profession,
    filters.region,
    filters.gender !== "all" ? filters.gender : "",
    filters.age_range,
    filters.search,
  ].filter(Boolean).length;

  const activeTabLabel =
    activeSubTab === "mine"
      ? activeSection === "vacancies"
        ? t("nav.my_vacancies")
        : t("nav.my_resumes")
      : activeSubTab === "saved"
        ? t("nav.saved")
        : activeSubTab === "more"
          ? t("nav.more")
          : activeSection === "vacancies"
            ? t("nav.vacancies")
            : activeSection === "daily-workers"
              ? t("nav.daily_workers")
              : t("nav.resumes");

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
      setFilters({
        profession: "",
        region: "",
        gender: "all",
        age_range: "",
        search: "",
      });
      return;
    }

    setIsFilterModalOpen(true);
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
          setTimeout(() => setIsNavigating(false), 300);
        }
      }}
      role={initialRole}
      onToggleRole={() => setIsRoleModalOpen(true)}
      savedCount={activeSection === "daily-workers" ? savedDailyJobSeekerIds.length : savedIds.length}
    >
      <div className="space-y-3">
        {activeSubTab !== "more" && (
          <section className="bg-white rounded-2xl border border-slate-100 card-shadow px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {activeTabLabel}
              </p>
              <h2 className="text-base font-extrabold text-slate-900 truncate">
                {getSectionLabel(activeSection)}
              </h2>
            </div>
            <div className="shrink-0 min-w-10 h-10 px-3 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-list text-[11px] text-slate-400" />
              <span className="text-sm font-extrabold">{filteredItems.length}</span>
            </div>
          </section>
        )}

        {/* Filter bar — compact pill */}
        {activeSubTab === "all" && (
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="w-full py-3 bg-white rounded-2xl border border-slate-100 card-shadow flex items-center justify-between px-4 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl ${activeFilterCount > 0 ? accentBg + " text-white" : "bg-slate-100 text-slate-400"} flex items-center justify-center transition-colors`}
              >
                <i className="fa-solid fa-sliders text-sm" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-bold text-slate-800">
                  {t("client_panel.filters")}
                </span>
                <span className={`text-[10px] font-medium ${
                  activeFilterCount > 0
                    ? accentText
                    : "text-slate-400"
                }`}>
                  {activeFilterCount > 0
                    ? t("client_panel.filters_active_count", { count: activeFilterCount })
                    : t("client_panel.no_filters")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className={`min-w-6 h-6 px-2 rounded-full text-[10px] font-extrabold flex items-center justify-center ${accentBg} text-white`}>
                  {activeFilterCount}
                </span>
              )}
              <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]" />
            </div>
          </button>
        )}

        {/* Add button — gradient style */}
        {activeSubTab === "mine" && (
          <button
            onClick={activeSection === "vacancies" ? onAddVacancy : onAddResume}
            className={`w-full py-4 rounded-2xl font-bold uppercase text-white tracking-wide text-[11px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg ${accentGradient}`}
          >
            <i className="fa-solid fa-plus text-sm" />
            {activeSection === "vacancies"
              ? t("client_panel.post_vacancy")
              : activeSection === "daily-workers"
                ? t("client_panel.create_daily_profile")
                : t("client_panel.create_resume")}
          </button>
        )}

        {activeSubTab === "more" ? (
          <div className="fade-up space-y-4 pb-20">
            {/* ─── Profile Card ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow p-5 text-center">
              <div className="relative inline-block mx-auto mb-3">
                {currentUser?.photo_url &&
                currentUser.photo_url.trim() !== "" ? (
                  <img
                    src={currentUser.photo_url}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-20 h-20 rounded-2xl ${accentBg} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}
                  >
                    <i className={`fa-solid ${isCandidate ? "fa-user-graduate" : isDailyJobSeeker ? "fa-calendar-day" : "fa-user-tie"}`} />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {currentUser?.first_name} {currentUser?.last_name}
              </h2>
              {currentUser?.username && (
                <p className={`text-sm font-medium ${accentText} mt-0.5`}>
                  @{currentUser.username}
                </p>
              )}
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                {t("client_panel.preferences")}
              </p>
            </div>

            {/* ─── Section Switcher ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
                {t("nav.explore") || "Sections"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "vacancies",     label: t("nav.vacancies"),    icon: "fa-briefcase" },
                  { id: "workers",       label: t("nav.workers"),      icon: "fa-users" },
                  { id: "daily-workers", label: t("nav.daily_workers"), icon: "fa-people-group" },
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSection(s.id); setActiveSubTab("all"); setPage(1); }}
                    className={`py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-wide border transition-all flex flex-col items-center gap-1.5 active:scale-95 ${
                      activeSection === s.id
                        ? `${accentBg} text-white border-transparent shadow-md`
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <i className={`fa-solid ${s.icon} text-base`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Settings ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
              {/* Role switcher */}
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors active:scale-[0.98] border-b border-slate-50"
              >
                <div className={`w-9 h-9 rounded-xl ${isCandidate ? "bg-blue-50 text-blue-500" : isDailyJobSeeker ? "bg-emerald-50 text-emerald-500" : "bg-violet-50 text-violet-500"} flex items-center justify-center`}>
                  <i className="fa-solid fa-repeat text-sm" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-bold text-slate-800">{t("client_panel.context")}</p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {t("client_panel.switch_to", {
                      role: isCandidate
                        ? t("onboarding.partner")
                        : isDailyJobSeeker
                          ? t("onboarding.candidate")
                          : t("onboarding.daily_job_seeker"),
                    })}
                  </p>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-slate-300" />
              </button>

              {/* Language */}
              <button
                onClick={() => setIsLangModalOpen(true)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                  <i className="fa-solid fa-globe text-sm" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-bold text-slate-800">{t("client_panel.localization")}</p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {LANGUAGES.find((l) => l.code === currentLang)?.name || currentLang}
                  </p>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-slate-300" />
              </button>
            </div>

            {/* ─── Logout ──────────────────────────────────────────── */}
            <button
              onClick={onLogout}
              className="w-full py-3.5 bg-white rounded-2xl border border-red-100 text-red-500 font-bold text-[11px] uppercase tracking-wide flex justify-center items-center gap-2 active:scale-[0.97] transition-all hover:bg-red-50 dark:bg-transparent dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
              {t("client_panel.terminate")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {isNavigating ? (
              <SkeletonList count={perPage} />
            ) : (
              <>
                {pagedItems.map((item: any) => {
                  const isVacancy = "company_name" in item;

                  // saved or all → explorer cards
                  if (activeSubTab === "saved" || activeSubTab === "all") {
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
                      />
                    );
                  }

                  // mine → owner cards
                  if (isVacancy) {
                    return (
                      <ClientVacancyOwnerCard
                        key={item.id}
                        vacancy={item}
                        onEdit={onEditVacancy}
                        onDelete={(id) => setDeleteTarget({ id, type: "v" })}
                      />
                    );
                  }
                  return (
                    <ClientResumeOwnerCard
                      key={item.id}
                      resume={item}
                      onEdit={activeSection === "daily-workers" ? (onEditDailyJobSeeker as any) : onEditResume}
                      onDelete={(id) => setDeleteTarget({ id, type: activeSection === "daily-workers" ? "d" : "r" })}
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
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto ${
                      activeSubTab === "saved" ? "bg-amber-50 text-amber-300 dark:bg-amber-900/30 dark:text-amber-500" : "bg-slate-50 text-slate-300 dark:bg-slate-800 dark:text-slate-500"
                    }`}>
                      <i className={`fa-solid ${
                        activeSubTab === "saved" ? "fa-bookmark" : activeSubTab === "mine" ? "fa-folder-open" : "fa-magnifying-glass"
                      }`} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mb-1">
                      {t("client_panel.empty_section", {
                        tab: getSectionLabel(activeSection),
                      })}
                    </p>
                    <p className="text-[10px] font-medium text-slate-300 dark:text-slate-500">
                      {activeSubTab === "saved" ? t("nav.saved") : activeSubTab === "mine" ? t("nav.my_resumes") : t("nav.resumes")}
                    </p>
                    <button
                      onClick={handleEmptyStateAction}
                      className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-white active:scale-95 transition-all ${accentBg}`}
                    >
                      <i className={`fa-solid ${
                        activeSubTab === "mine"
                          ? "fa-plus"
                          : activeSubTab === "saved"
                            ? "fa-arrow-left"
                            : activeFilterCount > 0
                              ? "fa-filter-circle-xmark"
                              : "fa-sliders"
                      } text-[11px]`} />
                      {activeSubTab === "mine"
                        ? activeSection === "vacancies"
                          ? t("client_panel.post_vacancy")
                          : activeSection === "daily-workers"
                            ? t("client_panel.create_daily_profile")
                            : t("client_panel.create_resume")
                        : activeSubTab === "saved"
                          ? t("client_panel.browse_all")
                          : activeFilterCount > 0
                            ? t("client_panel.clear_filters")
                            : t("client_panel.open_filters")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {isFilterModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end animate-in fade-in duration-300 border-none"
        >
          <div
            className="bg-white w-full max-w-md mx-auto rounded-t-[3.5rem] p-6 pb-12 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>

            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {t("client_panel.filters")}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("client_panel.filters_subtitle")}
                </p>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-6 pb-20">
              <div className="space-y-4">
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    placeholder={
                      activeSection === "vacancies"
                        ? t("client_panel.search_company")
                        : t("client_panel.search_name")
                    }

                    className="w-full py-4 pl-12 pr-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                  />
                </div>
                <SearchableSelect
                  label={t("client_panel.profession")}
                  options={professionOptions}
                  value={filters.profession}
                  onChange={(v) => setFilters({ ...filters, profession: v })}
                  onSearch={handleProfessionSearch}
                  loading={isProfLoading}
                />
                <SearchableSelect
                  label={t("client_panel.region")}
                  options={regionOptions}
                  value={filters.region}
                  onChange={(v) => setFilters({ ...filters, region: v })}
                  onSearch={handleRegionSearch}
                  loading={isRegionLoading}
                />
              </div>

              {(activeSection === "workers" || activeSection === "daily-workers") && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="h-px bg-slate-50"></div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                      {t("client_panel.gender_label")}
                    </p>
                    <div className="flex gap-2">
                      {["all", "male", "female"].map((g) => (
                        <button
                          key={g}
                          onClick={() =>
                            setFilters({ ...filters, gender: g as any })
                          }
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.gender === g ? `text-white shadow-lg ${accentFilterTag}` : "bg-slate-50  border-slate-50 text-slate-500"}`}
                        >
                          {t(`client_panel.gender.${g}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 text-slate-400">
                      {t("client_panel.age_range")}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {["18-25", "25-35", "35-45", "45+"].map((range) => (
                        <button
                          key={range}
                          onClick={() =>
                            setFilters({
                              ...filters,
                              age_range:
                                filters.age_range === range ? "" : range,
                            })
                          }
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.age_range === range ? `text-white shadow-lg ${accentFilterTag}` : "bg-slate-50  border-slate-50 text-slate-500"}`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
              <div className="w-full max-w-md mx-auto flex flex-col gap-3">
                {(filters.profession ||
                  filters.region ||
                  filters.gender !== "all" ||
                  filters.age_range ||
                  filters.search) && (
                  <button
                    onClick={() =>
                      setFilters({
                        profession: "",
                        region: "",
                        gender: "all",
                        age_range: "",
                        search: "",
                      })
                    }
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {t("client_panel.clear_filters")}
                  </button>
                )}
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all ${accentBg}`}
                >
                  {t("client_panel.apply_filters")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isRoleModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end animate-in fade-in duration-300"
          onClick={() => !isRoleSaving && setIsRoleModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md mx-auto rounded-t-[3.5rem] p-6 pb-16 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {t("client_panel.switch_title")}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("onboarding.select_objective")}
                </p>
              </div>
              <button
                onClick={() => !isRoleSaving && setIsRoleModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect(UserRole.CANDIDATE_HUNTER)}
                disabled={isRoleSaving}
                className={`w-full p-6 bg-white border rounded-[2rem] shadow-sm flex items-center gap-6 group text-left transition-all ${initialRole === UserRole.CANDIDATE_HUNTER ? "ring-2 ring-purple-500 border-purple-200" : "border-slate-100 hover:ring-2 hover:ring-purple-50"}`}
              >
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <i className="fa-solid fa-user-tie"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-normal">
                    {t("onboarding.partner")}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    {t("onboarding.partner_desc")}
                  </p>
                </div>
                {initialRole === UserRole.CANDIDATE_HUNTER && (
                  <i className="fa-solid fa-check text-purple-600"></i>
                )}
              </button>
              <button
                onClick={() => handleRoleSelect(UserRole.JOB_SEEKER)}
                disabled={isRoleSaving}
                className={`w-full p-6 bg-white border rounded-[2rem] shadow-sm flex items-center gap-6 group text-left transition-all ${initialRole === UserRole.JOB_SEEKER ? "ring-2 ring-blue-500 border-blue-200" : "border-slate-100 hover:ring-2 hover:ring-blue-50"}`}
              >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i className="fa-solid fa-user-graduate"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-normal">
                    {t("onboarding.candidate")}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    {t("onboarding.candidate_desc")}
                  </p>
                </div>
                {initialRole === UserRole.JOB_SEEKER && (
                  <i className="fa-solid fa-check text-blue-600"></i>
                )}
              </button>
              <button
                onClick={() => handleRoleSelect(UserRole.DAILY_JOB_SEEKER)}
                disabled={isRoleSaving}
                className={`w-full p-6 bg-white border rounded-[2rem] shadow-sm flex items-center gap-6 group text-left transition-all ${initialRole === UserRole.DAILY_JOB_SEEKER ? "ring-2 ring-emerald-500 border-emerald-200" : "border-slate-100 hover:ring-2 hover:ring-emerald-50"}`}
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-normal">
                    {t("onboarding.daily_job_seeker")}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    {t("onboarding.daily_job_seeker_desc")}
                  </p>
                </div>
                {initialRole === UserRole.DAILY_JOB_SEEKER && (
                  <i className="fa-solid fa-check text-emerald-600"></i>
                )}
              </button>
            </div>
            {isRoleSaving && (
              <div className="mt-6 flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse delay-150"></div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {isLangModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-[3.5rem] p-4 pb-16 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10"></div>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {t("client_panel.lang_title")}
              </h3>
              <p className="text-[10px] font-bold  uppercase tracking-widest">
                {t("client_panel.lang_subtitle")}
              </p>
            </div>
            <div className="space-y-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
                  className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex justify-between items-center px-10 border ${currentLang === l.code ? `${accentBg} text-white border-transparent shadow-2xl shadow-slate-200` : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"}`}
                >
                  {l.name}
                  {currentLang === l.code && (
                    <i className="fa-solid fa-check text-sm"></i>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsLangModalOpen(false)}
              className="w-full mt-10 py-4 text-slate-300 font-black uppercase tracking-widest text-[10px]"
            >
              {t("client_panel.cancel_selection")}
            </button>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={t("client_panel.delete_confirm", {
          type:
            deleteTarget?.type === "v"
              ? t("common.vacancy")
              : deleteTarget?.type === "d"
                ? t("nav.daily_workers")
                : t("common.resume"),
        })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
};

export default ClientPanel;
