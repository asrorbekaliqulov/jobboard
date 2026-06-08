import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Vacancy, Resume, Profession, Region, District, Work, AdminFilters } from '../../types.ts';
import { SearchableSelect, Pagination, ConfirmModal } from '../../components/Shared.tsx';
import { adminApi } from '../../services/adminApi.ts';
import { professionService } from '../../services/professionService.ts';
import { regionService } from '../../services/regionService.ts';
import { vacancyService } from '../../services/vacancyService.ts';
import { resumeService } from '../../services/resumeService.ts';

interface AdminPanelProps {
  users: User[];

  onLogout: () => void;
  onEditUser: (u: User) => void;
  onEditVacancy: (v: Vacancy) => void;
  onEditResume: (r: Resume) => void;
  onEditProfession: (p: Profession) => void;
  onEditRegion: (r: Region) => void;
  onEditDistrict: (d: District) => void;
  onEditWork: (w: Work) => void;
  onDelete: (type: string, id: string | number) => Promise<void>;
  refreshSignal?: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  users, onLogout,
  onEditUser, onEditVacancy, onEditResume,
  onEditProfession, onEditRegion, onEditDistrict, onEditWork, onDelete,
  refreshSignal = 0
}) => {
  const { t, i18n } = useTranslation();
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'uz', label: 'O\'zbekcha' }
  ];

  const getLocalizedName = useCallback((item: any) => {
    if (!item) return '';
    const lang = i18n.language?.toLowerCase() || 'en';
    return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz || item.name;
  }, [i18n.language]);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const SS = String(d.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${HH}:${MM}:${SS}`;
  };

  const [activeTab, setActiveTab] = useState<'users' | 'vacancies' | 'resumes' | 'professions' | 'regions' | 'districts' | 'works'>('users');
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [localVacancies, setLocalVacancies] = useState<Vacancy[]>([]);
  const [totalVacancies, setTotalVacancies] = useState(0);
  const [localResumes, setLocalResumes] = useState<Resume[]>([]);
  const [totalResumes, setTotalResumes] = useState(0);

  const [professions, setProfessions] = useState<Profession[]>([]);
  const [totalProfessions, setTotalProfessions] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [totalRegions, setTotalRegions] = useState(0);
  const [districts, setDistricts] = useState<District[]>([]);
  const [totalDistricts, setTotalDistricts] = useState(0);
  const [works, setWorks] = useState<Work[]>([]);
  const [totalWorks, setTotalWorks] = useState(0);
  const [allRegions, setAllRegions] = useState<Region[]>([]); // For filters
  const [allProfessions, setAllProfessions] = useState<Profession[]>([]); // For filters
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<AdminFilters & { isActive?: string, selectedRegionId?: string | number, selectedProfessionId?: string | number, age_from?: number, age_till?: number }>({
    search: '',
    status: 'all',
    bot_blocked: 'all',
    isActive: 'all',
    selectedRegionId: '',
    selectedProfessionId: '', // Note: we should verify if API expects empty string or undefined? Usually handling it in call.
    age_from: undefined,
    age_till: undefined
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number, type: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeFilter = filters.isActive === 'all' ? undefined : filters.isActive === 'true';
      if (activeTab === 'professions') {
        const { items, total } = await adminApi.professions.list(filters.search, activeFilter, page, perPage);
        setProfessions(items);
        setTotalProfessions(total);
      } else if (activeTab === 'regions') {
        const { items, total } = await adminApi.regions.list(filters.search, activeFilter, page, perPage);
        setRegions(items);
        setTotalRegions(total);
      } else if (activeTab === 'users') {
        const { items, total } = await adminApi.users.list(
          filters.search,
          filters.isActive === 'all' ? undefined : filters.isActive === 'true',
          typeof filters.bot_blocked !== 'boolean' ? undefined : filters.bot_blocked,
          page,
          perPage
        );
        setLocalUsers(items);
        setTotalUsers(total);
      } else if (activeTab === 'districts') {
        const { items, total } = await adminApi.districts.list(filters.selectedRegionId || undefined, filters.search, activeFilter, page, perPage);
        setDistricts(items);
        setTotalDistricts(total);
      } else if (activeTab === 'works') {
        const { items, total } = await adminApi.works.list(filters.search, activeFilter, page, perPage);
        setWorks(items);
        setTotalWorks(total);
      } else if (activeTab === 'vacancies') {
        const res = await vacancyService.getVacancies({
          skip: (page - 1) * perPage,
          limit: perPage,
          search: filters.search,
          status: filters.status === 'all' ? undefined : filters.status as any,
          profession_id: filters.selectedProfessionId ? Number(filters.selectedProfessionId) : undefined,
          region_id: filters.selectedRegionId ? Number(filters.selectedRegionId) : undefined,
        });
        setLocalVacancies(res.items);
        setTotalVacancies(res.total);
      } else if (activeTab === 'resumes') {
        const res = await resumeService.getResumes({
          skip: (page - 1) * perPage,
          limit: perPage,
          search: filters.search,
          status: filters.status === 'all' ? undefined : filters.status as any,
          profession_id: filters.selectedProfessionId ? Number(filters.selectedProfessionId) : undefined,
          region_id: filters.selectedRegionId ? Number(filters.selectedRegionId) : undefined,
          age_from: filters.age_from,
          age_till: filters.age_till
        });
        setLocalResumes(res.items);
        setTotalResumes(res.total);
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filters.search, filters.isActive, filters.selectedRegionId, filters.bot_blocked, filters.status, filters.selectedProfessionId, filters.age_from, filters.age_till, page]);

  useEffect(() => {
    if (['users', 'vacancies', 'resumes', 'professions', 'regions', 'districts', 'works'].includes(activeTab)) {
      fetchData();
    }
  }, [activeTab, filters.search, filters.isActive, filters.selectedRegionId, filters.bot_blocked, filters.status, filters.selectedProfessionId, filters.age_from, filters.age_till, page, refreshSignal, fetchData]);

  useEffect(() => {
    // Fetch all regions and professions once for filters
    regionService.getRegions().then(setAllRegions).catch(console.error);
    professionService.getProfessions().then(setAllProfessions).catch(console.error);
  }, [refreshSignal]);

  const activeList = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'users') list = localUsers;
    else if (activeTab === 'vacancies') list = localVacancies;
    else if (activeTab === 'resumes') list = localResumes;
    else if (activeTab === 'professions') list = professions;
    else if (activeTab === 'regions') list = regions;
    else if (activeTab === 'districts') list = districts;
    else if (activeTab === 'works') list = works;

    return list.filter(item => {
      const q = filters.search?.toLowerCase() || '';

      // For tabs that fetch their own data with filters, we already have correct data.
      if (['users', 'vacancies', 'resumes', 'professions', 'regions', 'districts'].includes(activeTab)) return true;

      const matchSearch = activeTab === 'users' ? (item.username.toLowerCase().includes(q) || item.phone.includes(q)) :
        activeTab === 'vacancies' ? (item.company_name.toLowerCase().includes(q) || item.phone.includes(q)) :
          activeTab === 'resumes' ? (item.first_name.toLowerCase().includes(q) || item.phone.includes(q)) :
            (item.name?.toLowerCase().includes(q) || item.name_uz?.toLowerCase().includes(q) || item.name_ru?.toLowerCase().includes(q) || item.name_en?.toLowerCase().includes(q));

      const matchStatus = filters.status === 'all' || item.status === filters.status;
      const matchBot = filters.bot_blocked === 'all' || !('bot_blocked' in item) || item.bot_blocked === filters.bot_blocked;
      const matchRegion = !filters.selectedRegionId || item.region_id?.toString() === filters.selectedRegionId.toString();
      const matchProfession = !filters.selectedProfessionId || item.profession_id?.toString() === filters.selectedProfessionId.toString();

      return matchSearch && matchStatus && matchBot && matchRegion && matchProfession;
    });
  }, [activeTab, localUsers, localVacancies, localResumes, professions, regions, districts, filters.search, filters.status, filters.bot_blocked]);

  const pagedList = useMemo(() => {
    // For tabs that fetch their own data from server, data is already paginated
    if (['users', 'vacancies', 'resumes', 'professions', 'regions', 'districts', 'works'].includes(activeTab)) {
      if (activeTab === 'users') return localUsers;
      if (activeTab === 'vacancies') return localVacancies;
      if (activeTab === 'resumes') return localResumes;
      if (activeTab === 'professions') return professions;
      if (activeTab === 'regions') return regions;
      if (activeTab === 'districts') return districts;
      if (activeTab === 'works') return works;
    }
    const start = (page - 1) * perPage;
    return activeList.slice(start, start + perPage);
  }, [activeList, page, localUsers, professions, regions, districts, works, activeTab]);

  const getStatusBadge = (item: any) => {
    const isActive = item.is_active !== undefined ? item.is_active : (typeof item.status === 'boolean' ? item.status : item.status === 'active');
    const label = isActive ? t('client_forms.status.active') : 'Inactive'; // Reuse or add key
    // Actually better to have dedicated status keys. Let's use simple logic.
    const statusLabel = isActive ? t('client_forms.status.active') : (item.status === 'draft' ? t('client_forms.status.draft') : (item.status === 'deleted' ? t('client_forms.status.deleted') : 'inactive'));
    const colorClass = isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500';
    return (
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${colorClass}`}>{label}</span>
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        if (deleteTarget.type === 'vacancies') {
          await vacancyService.deleteVacancy(Number(deleteTarget.id));
          setLocalVacancies(prev => prev.filter(v => v.id !== deleteTarget.id));
          setTotalVacancies(prev => prev - 1);
        } else if (deleteTarget.type === 'resumes') {
          await resumeService.deleteResume(Number(deleteTarget.id));
          setLocalResumes(prev => prev.filter(r => r.id !== deleteTarget.id));
          setTotalResumes(prev => prev - 1);
        } else {
          await onDelete(deleteTarget.type, deleteTarget.id);
        }
      } catch (e) {
        alert(t('admin_panel.failed_delete'));
      }
      setDeleteTarget(null);
    }
  };

  const regionOptions = useMemo(() => [
    { value: '', label: t('filters.all_regions') },
    ...allRegions.map(r => ({ value: r.id, label: getLocalizedName(r) }))
  ], [allRegions, t, getLocalizedName]);

  const professionOptions = useMemo(() => [
    { value: '', label: t('filters.all_professions') },
    ...allProfessions.map(p => ({ value: p.id, label: getLocalizedName(p) }))
  ], [allProfessions, t, getLocalizedName]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <nav className="border-b border-slate-100 px-10 py-6 flex items-center justify-between sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center gap-10">
          <h1 className="text-xl font-black uppercase tracking-normal">Admin<span className="text-blue-600">{t('admin_panel.core')}</span></h1>
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 overflow-x-auto max-w-[800px]">
            {(['users', 'vacancies', 'resumes', 'professions', 'regions', 'districts', 'works'] as const).map(t_tab => (
              <button key={t_tab} onClick={() => { setActiveTab(t_tab); setPage(1); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t_tab ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : ' hover:text-slate-600'}`}>{t(`admin_panel.tabs.${t_tab}`)}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i18n.language === lang.code ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <button onClick={onLogout} className="px-5 py-2.5 rounded-xl bg-slate-100 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-200 transition-all">{t('admin_panel.logout')}</button>
        </div>
      </nav>

      <main className="p-4 flex-1 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 items-end bg-slate-50/50 px-4 py-6 rounded-[2.5rem] border border-slate-100">
          <div className="flex-1 min-w-[300px]">
            <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('admin_panel.search_keywords')}</p>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input
                value={filters.search}
                onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('admin_panel.keywords_placeholder')}
              />
            </div>
          </div>

          {['professions', 'regions', 'districts', 'users', 'works'].includes(activeTab) ? (
            <div className="w-48">
              <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('admin_panel.account_status')}</p>
              <select value={filters.isActive} onChange={e => { setFilters({ ...filters, isActive: e.target.value }); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="all">{t('filters.gender.all')}</option>
                <option value="true">{t('client_forms.status.active')}</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          ) : (
            <div className="w-48">
              <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('client_forms.current_status')}</p>
              <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="all">{t('filters.gender.all')}</option>
                <option value="active">{t('client_forms.status.active')}</option>
                <option value="draft">{t('client_forms.status.draft')}</option>
                <option value="suspended">Suspended</option>
                <option value="deleted">{t('client_forms.status.deleted')}</option>
              </select>
            </div>
          )}

          {(activeTab === 'vacancies' || activeTab === 'resumes') && (
            <>
              <div className="w-64">
                <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('filters.profession')}</p>
                <SearchableSelect
                  options={professionOptions}
                  value={filters.selectedProfessionId ?? ''}
                  onChange={val => { setFilters({ ...filters, selectedProfessionId: val }); setPage(1); }}
                  placeholder={t('filters.all_professions')}
                  variant="admin"
                />
              </div>
              <div className="w-64">
                <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('filters.region')}</p>
                <SearchableSelect
                  options={regionOptions}
                  value={filters.selectedRegionId ?? ''}
                  onChange={val => { setFilters({ ...filters, selectedRegionId: val }); setPage(1); }}
                  placeholder={t('filters.all_regions')}
                  variant="admin"
                />
              </div>
            </>
          )}

          {activeTab === 'resumes' && (
            <div className="w-48">
              <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('client_forms.age')}</p>
              <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.age_from || ''}
                  className="w-1/2 p-4 text-sm font-bold outline-none border-r border-slate-100 text-center"
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setFilters({ ...filters, age_from: val });
                    setPage(1);
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.age_till || ''}
                  className="w-1/2 p-4 text-sm font-bold outline-none text-center"
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setFilters({ ...filters, age_till: val });
                    setPage(1);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'districts' && (
            <div className="w-64">
              <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('admin_forms.parent_region')}</p>
              <SearchableSelect
                options={regionOptions}
                value={filters.selectedRegionId ?? ''}
                onChange={val => { setFilters({ ...filters, selectedRegionId: val }); setPage(1); }}
                placeholder={t('common.select_option')}
                variant="admin"
              />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="w-48">
              <p className="text-[10px] font-black  uppercase mb-2 ml-1">{t('admin_panel.bot_connection')}</p>
              <select value={filters.bot_blocked === 'all' ? 'all' : (filters.bot_blocked ? 'true' : 'false')} onChange={e => { setFilters({ ...filters, bot_blocked: e.target.value === 'all' ? 'all' : e.target.value === 'true' }); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="all">{t('filters.gender.all')}</option>
                <option value="true">{t('admin_panel.blocked')}</option>
                <option value="false">{t('admin_panel.connected')}</option>
              </select>
            </div>
          )}

          <button
            onClick={() => {
              if (activeTab === 'professions') onEditProfession({} as any);
              else if (activeTab === 'regions') onEditRegion({} as any);
              else if (activeTab === 'districts') onEditDistrict({} as any);
              else if (activeTab === 'vacancies') onEditVacancy({} as any);
              else if (activeTab === 'resumes') onEditResume({} as any);
              else if (activeTab === 'works') onEditWork({} as any);
            }}
            className={`w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all ${['users'].includes(activeTab) ? 'hidden' : ''}`}
          >
            <i className="fa-solid fa-plus text-xl"></i>
          </button>
        </div>

        <div className="flex justify-between items-center mb-2 px-4">
          <span className="text-xs font-bold text-slate-500">
            {t('admin_panel.total_items', 'Total count')}: {
              activeTab === 'users' ? totalUsers :
                activeTab === 'vacancies' ? totalVacancies :
                  activeTab === 'resumes' ? totalResumes :
                    activeTab === 'professions' ? totalProfessions :
                      activeTab === 'regions' ? totalRegions :
                        activeTab === 'districts' ? totalDistricts :
                          activeTab === 'works' ? totalWorks :
                            activeList.length
            }
          </span>
        </div>

        {/* Data Table */}
        <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm flex-1 flex flex-col min-h-[500px]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  {activeTab === 'users' ? (
                    <tr>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  w-16">#</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.identity')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('client_forms.phone')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_forms.system_role')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  text-center">{t('admin_panel.table.is_admin')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  text-center">{t('admin_panel.table.bot_blocked')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.last_login')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  text-right">{t('admin_panel.table.actions')}</th>
                    </tr>
                  ) : ['professions', 'regions', 'districts', 'works'].includes(activeTab) ? (
                    <tr>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  w-16">#</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_forms.name_uz')}</th>
                      <th className="px-4 py-6 text-[10px) font-black uppercase ">{t('admin_forms.name_ru')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_forms.name_en')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('client_forms.current_status')}</th>
                      {activeTab !== 'professions' && activeTab !== 'works' && <th className="px-4 py-6 text-[10px] font-black uppercase ">{activeTab === 'regions' ? t('admin_panel.table.districts_count') : t('filters.region')}</th>}
                      <th className="px-4 py-6 text-[10px] font-black uppercase  text-right">{t('admin_panel.table.actions')}</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.principal_info')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.user_account', 'User Account')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.classification')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.metrics')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase ">{t('admin_panel.table.created_at')}</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase  text-right">{t('admin_panel.table.actions')}</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedList.length > 0 ? pagedList.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      {activeTab === 'users' ? (
                        <>
                          <td className="px-4 py-6 font-bold  text-xs">{(page - 1) * perPage + idx + 1}</td>
                          <td className="px-4 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                {item.photo_url ? (
                                  <img src={item.photo_url} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center "><i className="fa-solid fa-user"></i></div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight truncate max-w-[200px]" title={`${item.first_name} ${item.last_name}`}>{`${item.first_name || ''} ${item.last_name || ''}`.trim().slice(0, 50) + (`${item.first_name || ''} ${item.last_name || ''}`.trim().length > 50 ? '...' : '')}</p>
                                <p className="text-xs  font-bold">@{item.username || 'n/a'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-6 font-bold text-slate-600 text-xs">{item.phone || '-'}</td>
                          <td className="px-4 py-6">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest">{item.role}</span>
                          </td>
                          <td className="px-4 py-6 text-center">
                            {item.is_admin ? <i className="fa-solid fa-check text-green-500"></i> : <i className="fa-solid fa-xmark text-slate-300"></i>}
                          </td>
                          <td className="px-4 py-6 text-center">
                            {item.is_blocked ? (
                              <span className="px-2 py-1 rounded-md bg-red-100 text-red-600 text-[10px] font-bold">{t('admin_panel.blocked')}</span>
                            ) : (
                              <span className="px-2 py-1 rounded-md bg-green-100 text-green-600 text-[10px] font-bold">{t('client_forms.status.active')}</span>
                            )}
                          </td>
                          <td className="px-4 py-6 font-bold text-slate-600 text-xs">
                            {item.last_login ? formatDateTime(item.last_login) : '-'}
                          </td>
                        </>
                      ) : ['professions', 'regions', 'districts', 'works'].includes(activeTab) ? (
                        <>
                          <td className="px-4 py-6 font-bold  text-xs">{(page - 1) * perPage + idx + 1}</td>
                          <td className="px-4 py-6 font-bold text-slate-900">{item.name_uz}</td>
                          <td className="px-4 py-6 font-bold text-slate-900">{item.name_ru}</td>
                          <td className="px-4 py-6 font-bold text-slate-900">{item.name_en}</td>
                          <td className="px-4 py-6">{getStatusBadge(item)}</td>
                          {activeTab !== 'professions' && activeTab !== 'works' && (
                            <td className="px-4 py-6">
                              {activeTab === 'regions' ? (
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black">
                                  {item.districts_count || 0}
                                </span>
                              ) : (
                                <span className="text-xs font-bold ">
                                  {getLocalizedName(item.region) || `Region ID: ${item.region_id}`}
                                </span>
                              )}
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-6">
                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[200px]" title={activeTab === 'resumes' ? `${item.first_name} ${item.last_name}` : ''}>
                              {activeTab === 'vacancies' ? item.company_name : `${item.first_name || ''} ${item.last_name || ''}`.trim().slice(0, 50) + (`${item.first_name || ''} ${item.last_name || ''}`.trim().length > 50 ? '...' : '')}
                            </p>
                            <p className="text-xs  font-bold">{item.phone || `ID: ${item.id}`}</p>
                          </td>
                          <td className="px-4 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                {item.user?.photo_url ? (
                                  <img src={item.user.photo_url} alt="User avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px]"><i className="fa-solid fa-user"></i></div>
                                )}
                              </div>
                              <div className="truncate max-w-[120px]">
                                <p className="font-bold text-slate-900 text-xs leading-tight truncate">
                                  {item.user?.first_name ? `${item.user.first_name} ${item.user.last_name || ''}`.slice(0, 50) : (item.user?.username ? `@${item.user.username}` : 'N/A')}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 truncate">{item.user?.phone || item.user?.username || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            {getLocalizedName(item.profession) || 'N/A'}
                          </td>
                          <td className="px-4 py-6">
                            <div className="flex items-center gap-3">
                              {getStatusBadge(item)}
                              {item.viewed !== undefined && <span className="text-[10px] font-bold text-slate-300"><i className="fa-solid fa-eye mr-1"></i>{item.viewed}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-6 font-bold text-slate-600 text-xs">
                            {item.created_at ? formatDateTime(item.created_at) : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => {
                            if (activeTab === 'users') onEditUser(item);
                            else if (activeTab === 'vacancies') onEditVacancy(item);
                            else if (activeTab === 'resumes') onEditResume(item);
                            else if (activeTab === 'professions') onEditProfession(item);
                            else if (activeTab === 'regions') onEditRegion(item);
                            else if (activeTab === 'districts') onEditDistrict(item);
                            else if (activeTab === 'works') onEditWork(item);
                          }} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-pen-to-square"></i></button>
                          <button onClick={() => setDeleteTarget({ id: item.id, type: activeTab })} className="w-10 h-10 rounded-xl bg-red-50 text-red-300 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can"></i></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={activeTab === 'users' ? 8 : (['professions', 'regions', 'districts', 'works'].includes(activeTab) ? ((activeTab === 'professions' || activeTab === 'works') ? 6 : 7) : 6)} className="p-20 text-center">
                        <p className="text-slate-300 font-bold italic">{t('admin_panel.no_records')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-auto border-t border-slate-50 bg-slate-50/20">
            <Pagination
              current={page}
              total={
                activeTab === 'users' ? totalUsers :
                  activeTab === 'vacancies' ? totalVacancies :
                    activeTab === 'resumes' ? totalResumes :
                      activeTab === 'professions' ? totalProfessions :
                        activeTab === 'regions' ? totalRegions :
                          activeTab === 'districts' ? totalDistricts :
                            activeTab === 'works' ? totalWorks :
                              activeList.length
              }
              perPage={perPage}
              onChange={setPage}
              variant="dark"
            />
          </div>
        </div>
      </main >

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={t('admin_panel.purge_confirm', { type: deleteTarget?.type })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div >
  );
};

export default AdminPanel;
