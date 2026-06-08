
import React, { useState, useMemo } from 'react';
import { UserRole, Vacancy, Resume, Filters, ItemStatus, Gender, Profession, Region } from '../types.ts';
import Layout from '../components/Layout.tsx';
import { SearchableSelect, Pagination, ConfirmModal } from '../components/Shared.tsx';
import { VacancyCard, ResumeCard } from '../components/ClientComponents.tsx';
import { professionService } from '../services/professionService.ts';
import { regionService } from '../services/regionService.ts';

interface ClientPanelProps {
  initialRole: UserRole;
  vacancies: Vacancy[];
  resumes: Resume[];
  onAddVacancy: () => void;
  onAddResume: () => void;
  onEditVacancy: (v: Vacancy) => void;
  onEditResume: (r: Resume) => void;
  onDeleteVacancy: (id: string) => void;
  onDeleteResume: (id: string) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
}

const ClientPanel: React.FC<ClientPanelProps> = ({
  initialRole, vacancies, resumes, onAddVacancy, onAddResume,
  onEditVacancy, onEditResume, onDeleteVacancy, onDeleteResume,
  savedIds, onToggleSave
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [activeTab, setActiveTab] = useState(role === UserRole.JOB_SEEKER ? 'vacancies' : 'resumes');
  const [page, setPage] = useState(1);
  const perPage = 5;

  // Filter State
  const [filters, setFilters] = useState<Filters>({ region: '', profession: '', gender: 'all' });
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    professionService.getProfessions().then(setProfessions).catch(console.error);
    regionService.getRegions().then(setRegions).catch(console.error);
  }, []);

  const isCandidate = role === UserRole.JOB_SEEKER;
  const accentColor = isCandidate ? 'blue' : 'purple';

  const filteredItems = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'vacancies') list = vacancies.filter(v => v.status === ItemStatus.ACTIVE);
    else if (activeTab === 'resumes') list = resumes.filter(r => r.status === ItemStatus.ACTIVE);
    else if (activeTab === 'my-vacancies') list = vacancies.filter(v => v.hunterId === 'u2' && v.status !== ItemStatus.DELETED);
    else if (activeTab === 'my-resumes') list = resumes.filter(r => r.seekerId === 'u1' && r.status !== ItemStatus.DELETED);
    else if (activeTab === 'saved') {
      const vSaved = vacancies.filter(v => savedIds.includes(v.id));
      const rSaved = resumes.filter(r => savedIds.includes(r.id));
      list = [...vSaved, ...rSaved];
    }

    return list.filter(item => {
      const matchRegion = !filters.region || item.region === filters.region;
      const matchProfession = !filters.profession || item.profession === filters.profession;
      const matchGender = filters.gender === 'all' || !('gender' in item) || item.gender === filters.gender;
      return matchRegion && matchProfession && matchGender;
    });
  }, [activeTab, vacancies, resumes, savedIds, filters]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredItems.slice(start, start + perPage);
  }, [filteredItems, page]);

  const handleToggleRole = () => {
    console.log(UserRole)
    const next = isCandidate ? UserRole.CANDIDATE_HUNTER : UserRole.JOB_SEEKER;
    setRole(next);
    setActiveTab(next === UserRole.JOB_SEEKER ? 'vacancies' : 'resumes');
    setPage(1);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} role={role} onToggleRole={handleToggleRole}>
      <div className="space-y-6">
        {/* Filters Section */}
        {(activeTab === 'vacancies' || activeTab === 'resumes') && (
          <div className="bg-white px-4 py-6 rounded-[2.5rem] shadow-sm border border-slate-100 grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <SearchableSelect label="Profession" options={professions.map(p => ({ id: p.id, name: p.name_uz || p.name_en }))} value={filters.profession || ''} onChange={val => setFilters({ ...filters, profession: val })} accentColor={accentColor} />
              <SearchableSelect label="Region" options={regions.map(r => ({ id: r.id, name: r.name_uz || r.name_en }))} value={filters.region || ''} onChange={val => setFilters({ ...filters, region: val })} accentColor={accentColor} />
            </div>
            {activeTab === 'resumes' && (
              <div>
                <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Gender</p>
                <div className="flex gap-2">
                  {['all', Gender.MALE, Gender.FEMALE].map(g => (
                    <button key={g} onClick={() => setFilters({ ...filters, gender: g as any })} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.gender === g ? (isCandidate ? 'bg-blue-600 text-white border-blue-600' : 'bg-purple-600 text-white border-purple-600') : 'bg-white  border-slate-100'}`}>{g}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button for "My" tabs */}
        {(activeTab === 'my-vacancies' || activeTab === 'my-resumes') && (
          <button
            onClick={activeTab === 'my-vacancies' ? onAddVacancy : onAddResume}
            className={`w-full py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${isCandidate ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-purple-600 text-white shadow-purple-200'}`}
          >
            <i className="fa-solid fa-plus-circle text-lg"></i>
            {activeTab === 'my-vacancies' ? 'Post New Vacancy' : 'Create Resume'}
          </button>
        )}

        {/* Settings/More Tab */}
        {activeTab === 'profile' ? (
          <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 text-center space-y-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Settings</h2>
              <p className="text-xs font-bold  uppercase tracking-widest">Global application configurations</p>
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-3">Language</p>
              <div className="flex flex-col gap-3">
                {['English', 'Русский', 'O\'zbekcha'].map(l => (
                  <button key={l} className="w-full py-4 rounded-2xl bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">{l}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {pagedItems.map((item: any) => {
                const isVacancy = 'company_name' in item;
                const isMy = (isVacancy && item.hunterId === 'u2') || (!isVacancy && item.seekerId === 'u1');
                return isVacancy ? (
                  <VacancyCard
                    key={item.id}
                    vacancy={item}
                    isSaved={savedIds.includes(item.id)}
                    onSaveToggle={onToggleSave}
                    isOwner={isMy}
                    onEdit={onEditVacancy}
                    onDelete={id => setDeleteId(id)}
                    accentColor={accentColor}
                  />
                ) : (
                  <ResumeCard
                    key={item.id}
                    resume={item}
                    isSaved={savedIds.includes(item.id)}
                    onSaveToggle={onToggleSave}
                    isOwner={isMy}
                    onEdit={onEditResume}
                    onDelete={id => setDeleteId(id)}
                  />
                );
              })}
            </div>

            {/* Fixed: Removed unsupported accentColor prop */}
            <Pagination current={page} total={filteredItems.length} perPage={perPage} onChange={setPage} />

            {filteredItems.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-3xl mb-4 mx-auto"><i className="fa-solid fa-magnifying-glass"></i></div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No results found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Permanently remove this item?"
        onConfirm={() => { if (deleteId) { activeTab === 'my-vacancies' ? onDeleteVacancy(deleteId) : onDeleteResume(deleteId); } setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </Layout>
  );
};

export default ClientPanel;
