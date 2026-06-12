
import React, { useState } from 'react';
import { User, Vacancy, Resume, ItemStatus, UserRole, WorkFormat, WorkType, WorkSchedule, Gender, Profession, Region, District, Work } from '../../types.ts';
import { useTranslation } from 'react-i18next';
import { MOCK_PROFESSIONS, MOCK_REGIONS } from '../../constants.ts';
import RichTextEditor from '../../components/RichTextEditor.tsx';
import { SearchableSelect } from '../../components/Shared.tsx';
import { professionService } from '../../services/professionService.ts';
import { regionService } from '../../services/regionService.ts';
import { resumeService } from '../../services/resumeService.ts';

export const AdminUserForm: React.FC<{
  initialData?: User;
  onSave: (data: User) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t, i18n } = useTranslation();

  const getLocalizedName = (item: any) => {
    // @ts-ignore
    return item[`name_${i18n.language}`] || item.name_en || item.name_ru || item.name_uz;
  };
  const [formData, setFormData] = useState<User>(initialData || {
    id: 0,
    telegram_id: '',
    username: '',
    first_name: '',
    last_name: '',
    photo_url: '',
    phone: '',
    role: UserRole.JOB_SEEKER,
    language: 'English',
    last_login: new Date().toISOString(),
    is_active: true,
    is_blocked: false,
    is_admin: false
  });

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.user_control')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center  hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-8 border-b border-slate-100 pb-8">
            <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-4 border-slate-50 shadow-sm relative group">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-3xl"><i className="fa-solid fa-user"></i></div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-not-allowed">
                <span className="text-[10px] uppercase font-bold text-white">{t('admin_forms.preview_only')}</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.telegram_id')}</p>
                  <input disabled value={formData.telegram_id || t('admin_forms.not_linked')} className="w-full p-4 bg-slate-100 border border-transparent rounded-2xl font-bold text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.username')}</p>
                  <input value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.username')} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.first_name')}</p>
              <input value={formData.first_name || ''} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.first_name')} />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.last_name')}</p>
              <input value={formData.last_name || ''} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.last_name')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.phone')}</p>
              <input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.phone')} />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.system_role')}</p>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 appearance-none">
                <option value={UserRole.CANDIDATE_HUNTER}>{t('onboarding.partner')}</option>
                <option value={UserRole.JOB_SEEKER}>{t('onboarding.candidate')}</option>
                <option value={UserRole.DAILY_JOB_SEEKER}>{t('onboarding.daily_job_seeker')}</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
            </div>
          </div>

          <div className="px-4 py-6 bg-slate-50 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-200 '}`}>
                  <i className="fa-solid fa-power-off text-lg"></i>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('admin_forms.account_active')}</p>
                  <p className="text-xs font-bold ">{t('admin_forms.login_switch_desc')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_blocked ? 'bg-red-100 text-red-600' : 'bg-slate-200 '}`}>
                  <i className="fa-brands fa-telegram text-lg"></i>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('admin_forms.bot_blocked')}</p>
                  <p className="text-xs font-bold ">{t('admin_forms.bot_blocked_desc')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.is_blocked} onChange={e => setFormData({ ...formData, is_blocked: e.target.checked })} />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_admin ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 '}`}>
                  <i className="fa-solid fa-shield-halved text-lg"></i>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('admin_forms.admin_privileges')}</p>
                  <p className="text-xs font-bold ">{t('admin_forms.admin_privileges_desc')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.is_admin} onChange={e => setFormData({ ...formData, is_admin: e.target.checked })} />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all">{t('admin_forms.sync_user_data')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminVacancyForm: React.FC<{
  initialData?: Vacancy;
  onSave: (data: Vacancy) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t, i18n } = useTranslation();

  const getLocalizedName = (item: any) => {
    // @ts-ignore
    return item[`name_${i18n.language}`] || item.name_en || item.name_ru || item.name_uz;
  };

  const [formData, setFormData] = useState<Vacancy>(initialData?.id ? initialData : {
    id: 0,
    company_name: '',
    user_id: 1, // Default or selected user
    profession_id: 0,
    region_id: 0,
    status: ItemStatus.ACTIVE,
    description: '',
    work_format: WorkFormat.REMOTE,
    work_type: WorkType.FULLTIME,
    work_hours: 40,
    phone: '',
    telegram: '',
    email: '',
    schedule: WorkSchedule.S_5_2,
    exp_from: 0,
    exp_till: 3,
    viewed_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Pre-populate with initialData's profession/region if editing
  const [professions, setProfessions] = useState<Profession[]>(
    initialData?.profession ? [initialData.profession] : []
  );
  const [regions, setRegions] = useState<Region[]>(
    initialData?.region ? [initialData.region] : []
  );
  const [isProfLoading, setIsProfLoading] = useState(false);
  const [isRegionLoading, setIsRegionLoading] = useState(false);

  const handleProfessionSearch = React.useCallback(async (search: string) => {
    setIsProfLoading(true);
    try {
      const data = await professionService.getProfessions(search);
      setProfessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProfLoading(false);
    }
  }, []);

  const handleRegionSearch = React.useCallback(async (search: string) => {
    setIsRegionLoading(true);
    try {
      const data = await regionService.getRegions(search);
      setRegions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegionLoading(false);
    }
  }, []);

  React.useEffect(() => {
    handleProfessionSearch('');
    handleRegionSearch('');
  }, [handleProfessionSearch, handleRegionSearch]);

  const professionOptions = React.useMemo(() =>
    professions.map(p => ({ value: p.id, label: getLocalizedName(p) })),
    [professions, i18n.language]);

  const regionOptions = React.useMemo(() =>
    regions.map(r => ({ value: r.id, label: getLocalizedName(r) })),
    [regions, i18n.language]);

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.vacancy_control')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center  hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-8">
          {/* Core Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.company_name')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <input required value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('filters.profession')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <SearchableSelect
                options={professionOptions}
                value={formData.profession_id}
                onChange={val => setFormData({ ...formData, profession_id: Number(val) })}
                onSearch={handleProfessionSearch}
                loading={isProfLoading}
                placeholder={t('common.search')}
                variant="admin"
              />
            </div>
          </div>

          {/* Location & Status & Views */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.current_status')}</p>
              <select required value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ItemStatus })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={ItemStatus.ACTIVE}>{t('client_forms.status.active')}</option>
                <option value={ItemStatus.DRAFT}>{t('client_forms.status.draft')}</option>
                <option value={ItemStatus.ARCHIVED}>{t('client_forms.already_hired')}</option>
                <option value={ItemStatus.DELETED}>{t('client_forms.status.deleted')}</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.views_count')}</p>
              <input type="number" value={formData.viewed_count} onChange={e => setFormData({ ...formData, viewed_count: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('filters.region')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <SearchableSelect
                options={regionOptions}
                value={formData.region_id}
                onChange={val => setFormData({ ...formData, region_id: Number(val) })}
                onSearch={handleRegionSearch}
                loading={isRegionLoading}
                placeholder={t('common.search')}
                variant="admin"
              />
            </div>
          </div>

          {/* Salary */}
          <div className="bg-slate-50 px-4 py-6 rounded-[2rem]">
            <p className="text-[10px] font-black  uppercase tracking-widest mb-4 ml-1">{t('client_forms.salary')}</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">{t('client_forms.from')}</p>
                <input type="number" value={formData.salary_from || ''} onChange={e => setFormData({ ...formData, salary_from: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder="0" />
              </div>
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">{t('client_forms.till')}</p>
                <input type="number" value={formData.salary_till || ''} onChange={e => setFormData({ ...formData, salary_till: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('common.optional')} />
              </div>
            </div>
          </div>

          {/* Work Conditions */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.work_format')}</p>
              <select value={formData.work_format} onChange={e => setFormData({ ...formData, work_format: e.target.value as WorkFormat })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={WorkFormat.ONSITE}>{t('client_forms.work_format_options.onsite')}</option>
                <option value={WorkFormat.REMOTE}>{t('client_forms.work_format_options.remote')}</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.work_type')}</p>
              <select value={formData.work_type} onChange={e => setFormData({ ...formData, work_type: e.target.value as WorkType })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={WorkType.FULLTIME}>{t('client_forms.work_type_options.fulltime')}</option>
                <option value={WorkType.PART_TIME}>{t('client_forms.work_type_options.part_time')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_components.schedule')}</p>
              <select value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value as WorkSchedule })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={WorkSchedule.S_5_2}>5/2</option>
                <option value={WorkSchedule.S_6_1}>6/1</option>
                <option value={WorkSchedule.S_7_0}>7/0</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_components.work_hours')}</p>
              <input type="number" value={formData.work_hours} onChange={e => setFormData({ ...formData, work_hours: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_components.experience')}</p>
              <div className="flex gap-2">
                <input type="number" value={formData.exp_from} onChange={e => setFormData({ ...formData, exp_from: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 text-center" placeholder="0" />
                <span className="self-center font-bold text-slate-300">-</span>
                <input type="number" value={formData.exp_till} onChange={e => setFormData({ ...formData, exp_till: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 text-center" placeholder="10" />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-slate-50 px-4 py-6 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.contacts')}</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">{t('client_forms.phone')}</p>
                <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.phone')} />
              </div>
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">Telegram</p>
                <input value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.username')} />
              </div>
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">Email</p>
                <input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.email')} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.description')} <span className="text-red-500">({t('client_forms.required')})</span></p>
            <RichTextEditor value={formData.description} onChange={val => setFormData({ ...formData, description: val })} placeholder={t('admin_forms.internal_description')} maxLength={2000} accentColor="purple" />
          </div>
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all col-span-2">{t('admin_forms.update_record')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminResumeForm: React.FC<{
  initialData?: Resume;
  onSave: (data: Resume) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t, i18n } = useTranslation();

  const getLocalizedName = (item: any) => {
    // @ts-ignore
    return item[`name_${i18n.language}`] || item.name_en || item.name_ru || item.name_uz;
  };

  const [formData, setFormData] = useState<Resume>(initialData?.id ? initialData : {
    id: 0,
    first_name: '',
    last_name: '',
    age: 18,
    profession_id: 0,
    region_id: 0,
    gender: Gender.ANY,
    experience: 0,
    description: '',
    phone: '',
    telegram: '',
    email: '',
    status: ItemStatus.ACTIVE,
    created_at: new Date().toISOString(),
    viewed_count: 0,
    user_id: 0
  });

  // Pre-populate with initialData's profession/region if editing
  const [professions, setProfessions] = useState<Profession[]>(
    initialData?.profession ? [initialData.profession] : []
  );
  const [regions, setRegions] = useState<Region[]>(
    initialData?.region ? [initialData.region] : []
  );
  const [isProfLoading, setIsProfLoading] = useState(false);
  const [isRegionLoading, setIsRegionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfessionSearch = React.useCallback(async (search: string) => {
    setIsProfLoading(true);
    try {
      const data = await professionService.getProfessions(search);
      setProfessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProfLoading(false);
    }
  }, []);

  const handleRegionSearch = React.useCallback(async (search: string) => {
    setIsRegionLoading(true);
    try {
      const data = await regionService.getRegions(search);
      setRegions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegionLoading(false);
    }
  }, []);

  React.useEffect(() => {
    handleProfessionSearch('');
    handleRegionSearch('');
  }, [handleProfessionSearch, handleRegionSearch]);

  const professionOptions = React.useMemo(() =>
    professions.map(p => ({ value: p.id, label: getLocalizedName(p) })),
    [professions, i18n.language]);

  const regionOptions = React.useMemo(() =>
    regions.map(r => ({ value: r.id, label: getLocalizedName(r) })),
    [regions, i18n.language]);

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.admin_resume_control')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center  hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.first_name')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.last_name')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('filters.profession')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <SearchableSelect
                options={professionOptions}
                value={formData.profession_id}
                onChange={val => setFormData({ ...formData, profession_id: Number(val) })}
                onSearch={handleProfessionSearch}
                loading={isProfLoading}
                placeholder={t('common.search')}
                variant="admin"
              />
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('filters.gender_preference')}</p>
              <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={Gender.MALE}>{t('filters.gender.male')}</option>
                <option value={Gender.FEMALE}>{t('filters.gender.female')}</option>
                <option value={Gender.ANY}>{t('filters.gender.any')}</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('filters.region')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <SearchableSelect
                options={regionOptions}
                value={formData.region_id}
                onChange={val => setFormData({ ...formData, region_id: Number(val) })}
                onSearch={handleRegionSearch}
                loading={isRegionLoading}
                placeholder={t('common.search')}
                variant="admin"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.experience')}</p>
              <input type="number" value={formData.experience} onChange={e => setFormData({ ...formData, experience: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div className="col-span-1">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.age')} <span className="text-red-500">({t('client_forms.required')})</span></p>
              <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div className="col-span-1">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.current_status')}</p>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ItemStatus })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
                <option value={ItemStatus.ACTIVE}>{t('client_forms.status.active')}</option>
                <option value={ItemStatus.DRAFT}>{t('client_forms.status.draft')}</option>
                <option value={ItemStatus.ARCHIVED}>{t('client_forms.already_hired')}</option>
                <option value={ItemStatus.DELETED}>{t('client_forms.status.deleted')}</option>
              </select>
            </div>
            <div className="col-span-1">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.views_count')}</p>
              <input type="number" value={formData.viewed_count} onChange={e => setFormData({ ...formData, viewed_count: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-slate-50 px-4 py-6 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.contacts')}</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">{t('client_forms.phone')} <span className="text-red-500">({t('client_forms.required')})</span></p>
                <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.phone')} />
              </div>
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">Telegram <span className="text-red-500">({t('client_forms.required')})</span></p>
                <input value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.username')} />
              </div>
              <div>
                <p className="text-[9px] font-bold  uppercase mb-1 ml-1">Email</p>
                <input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder={t('admin_forms.placeholders.email')} />
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[9px] font-bold  uppercase mb-1 ml-1">Portfolio File</p>
              <div className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 p-4 bg-white border border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  {selectedFile ? selectedFile.name : (formData.portfolio ? t('client_forms.change_file') : t('client_forms.upload_portfolio'))}
                </button>
                {formData.portfolio && (
                  <a
                    href={formData.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                    title="View File"
                  >
                    <i className="fa-solid fa-eye"></i>
                  </a>
                )}
                {(formData.portfolio || selectedFile) && (
                  <button
                    type="button"
                    onClick={() => { setFormData({ ...formData, portfolio: '' }); setSelectedFile(null); }}
                    className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors"
                    title="Remove File"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('client_forms.description')} <span className="text-red-500">({t('client_forms.required')})</span></p>
            <RichTextEditor value={formData.description} onChange={val => setFormData({ ...formData, description: val })} placeholder={t('admin_forms.internal_summary')} maxLength={1200} accentColor="blue" />
          </div>
          <div className="pt-6">
            <button
              onClick={async () => {
                let finalData = { ...formData };
                if (selectedFile) {
                  setIsUploading(true);
                  try {
                    const { url } = await resumeService.uploadPortfolio(selectedFile);
                    finalData.portfolio = url;
                  } catch (e) {
                    alert(t('client_forms.failed_upload'));
                    setIsUploading(false);
                    return;
                  }
                  setIsUploading(false);
                }
                onSave(finalData);
              }}
              disabled={isUploading}
              className={`w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all ${isUploading ? 'opacity-50' : ''}`}
            >
              {isUploading ? t('client_forms.uploading') : t('admin_forms.update_resume_record')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminProfessionForm: React.FC<{
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t, i18n } = useTranslation();
  
  const [formData, setFormData] = useState<any>(initialData?.id ? initialData : {
    id: 0,
    name_uz: '',
    name_ru: '',
    name_en: '',
    is_active: true,
    parent_id: null,
  });

  const [parentProfessions, setParentProfessions] = useState<any[]>([]);

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    const lang = i18n.language?.split('-')[0] || 'en';
    return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz;
  };

  // Fetch top-level professions for the parent dropdown
  React.useEffect(() => {
    import('../../services/adminApi.ts').then(({ adminApi }) => {
      adminApi.professions.list('', undefined, 1, 200)
        .then(res => {
          // Filter out the current profession and show only those that can be parents
          // (top-level = no parent, or any profession that isn't a child of this one)
          const filtered = res.items.filter((p: any) => p.id !== formData.id);
          setParentProfessions(filtered);
        })
        .catch(console.error);
    });
  }, [formData.id]);

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">
            {t('admin_forms.profession_property')}
          </h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center  hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_uz')}</p>
            <input value={formData.name_uz} onChange={e => setFormData({ ...formData, name_uz: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_ru')}</p>
            <input value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_en')}</p>
            <input value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>

          {/* Parent profession selector */}
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">
              {t('admin_forms.parent_profession') || 'Asosiy kasb (parent)'}
            </p>
            <select
              value={formData.parent_id || ''}
              onChange={e => setFormData({ ...formData, parent_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">{t('admin_forms.no_parent') || '-- Asosiy (parent yo\'q) --'}</option>
              {parentProfessions
                .filter((p: any) => !p.parent_id) // Only show top-level as potential parents
                .map((p: any) => (
                  <option key={p.id} value={p.id}>{getLocalizedName(p)}</option>
                ))
              }
            </select>
            <p className="text-[9px] text-slate-400 mt-1 ml-1">
              {t('admin_forms.parent_hint') || 'Sub-kasb bo\'lsa, asosiy kasbni tanlang. Masalan: "IT" → "Backend dasturlash"'}
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-slate-900" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('admin_forms.is_active_platform')}</span>
          </div>
          <div className="pt-10">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all">
              {t('admin_forms.confirm_profession')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminRegionForm: React.FC<{
  initialData?: Region;
  onSave: (data: Region) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Region>(initialData?.id ? initialData : {
    id: 0,
    name_uz: '',
    name_ru: '',
    name_en: '',
    is_active: true
  });

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.region_property')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center  hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_uz')}</p>
            <input value={formData.name_uz} onChange={e => setFormData({ ...formData, name_uz: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_ru')}</p>
            <input value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_en')}</p>
            <input value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-slate-900" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('admin_forms.is_active_platform')}</span>
          </div>
          <div className="pt-10">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all">{t('admin_forms.confirm_region')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDistrictForm: React.FC<{
  initialData?: District;
  regions: Region[];
  onSave: (data: District) => void;
  onCancel: () => void;
}> = ({ initialData, regions, onSave, onCancel }) => {
  const { t, i18n } = useTranslation();

  const getLocalizedName = (item: any) => {
    // @ts-ignore
    return item[`name_${i18n.language}`] || item.name_en || item.name_ru || item.name_uz;
  };
  const [formData, setFormData] = useState<District>(initialData?.id ? initialData : {
    id: 0,
    name_uz: '',
    name_ru: '',
    name_en: '',
    is_active: true,
    region_id: regions[0]?.id || 0
  });

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.district_property')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center  hover:bg-slate-50 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.parent_region')}</p>
            <SearchableSelect
              options={regions.map(r => ({ value: r.id, label: getLocalizedName(r) }))}
              value={formData.region_id}
              onChange={val => setFormData({ ...formData, region_id: val })}
              placeholder={t('common.search')}
              variant="admin"
            />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_uz')}</p>
            <input value={formData.name_uz} onChange={e => setFormData({ ...formData, name_uz: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_ru')}</p>
            <input value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black  uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_en')}</p>
            <input value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-slate-900" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('admin_forms.is_active_platform')}</span>
          </div>
          <div className="pt-10">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all">{t('admin_forms.confirm_district')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminWorkForm: React.FC<{
  initialData?: Work;
  onSave: (data: Work) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Work>(initialData?.id ? initialData : {
    id: 0,
    name_uz: '',
    name_ru: '',
    name_en: '',
    status: true
  });

  return (
    <div className="fixed inset-0 bg-white z-[1100] flex flex-col p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-normal text-slate-900">{t('admin_forms.work_property')}</h2>
          <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_uz')}</p>
            <input value={formData.name_uz} onChange={e => setFormData({ ...formData, name_uz: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_ru')}</p>
            <input value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1">{t('admin_forms.name_en')}</p>
            <input value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <input type="checkbox" checked={formData.status} onChange={e => setFormData({ ...formData, status: e.target.checked })} className="w-5 h-5 accent-slate-900" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('admin_forms.is_active_platform')}</span>
          </div>
          <div className="pt-10">
            <button onClick={() => onSave(formData)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all">{t('admin_forms.confirm_work')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
