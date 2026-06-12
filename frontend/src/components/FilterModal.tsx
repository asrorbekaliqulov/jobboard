import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Filters, Gender, WorkFormat, WorkType, Profession } from '../types.ts';
import { SearchableSelect } from './Shared.tsx';
import { professionService } from '../services/professionService.ts';
import { getProfessionIcon } from '../utils/professionIcons.ts';

interface FilterModalProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onClose: () => void;
  professions: any[];
  regions: any[];
  isProfLoading?: boolean;
  isRegionLoading?: boolean;
  onProfessionSearch?: (search: string) => void;
  onRegionSearch?: (search: string) => void;
  activeSection: "vacancies" | "workers" | "daily-workers";
  userRole?: string;
  onCreateItem?: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  filters, 
  setFilters, 
  onClose,
  professions,
  regions,
  isProfLoading = false,
  isRegionLoading = false,
  onProfessionSearch,
  onRegionSearch,
  activeSection,
  userRole,
  onCreateItem
}) => {
  const { t, i18n } = useTranslation();
  const [tempFilters, setTempFilters] = useState<Filters>(filters);
  const [categories, setCategories] = useState<Profession[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCatLoading, setIsCatLoading] = useState(false);

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    const lang = i18n.language.split('-')[0];
    return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz || item.name;
  };

  // Load professions tree on mount
  useEffect(() => {
    setIsCatLoading(true);
    professionService.getTree()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setIsCatLoading(false));
  }, []);

  // Determine initial selected category from current filter
  useEffect(() => {
    const profStr = String(tempFilters.profession || '');
    if (profStr && profStr.startsWith('cat_')) {
      const catId = parseInt(profStr.replace('cat_', ''));
      // Check if it's a top-level category or subcategory
      for (const cat of categories) {
        if (cat.id === catId) {
          setSelectedCategoryId(cat.id);
          break;
        }
        if (cat.children?.some(c => c.id === catId)) {
          setSelectedCategoryId(cat.id);
          break;
        }
      }
    }
  }, [categories, tempFilters.profession]);

  const professionOptions = useMemo(
    () => [
      { value: '', label: t('filters.all_professions') },
      ...professions.map((p) => ({ value: p.id, label: getLocalizedName(p) }))
    ],
    [professions, getLocalizedName, t]
  );

  const regionOptions = useMemo(
    () => [
      { value: '', label: t('filters.all_regions') },
      ...regions.map((r) => ({ value: r.id, label: getLocalizedName(r) }))
    ],
    [regions, getLocalizedName, t]
  );

  const clearFilters = () => {
    const emptyFilters: Filters = {
      region: '',
      profession: '',
      gender: 'all',
      age_range: '',
      salary_range: '',
      work_format: '',
      work_type: '',
      experience: '',
      search: ''
    };
    setTempFilters(emptyFilters);
    setSelectedCategoryId(null);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    onClose();
  };

  const handleCategorySelect = (catId: number) => {
    const cat = categories.find(c => c.id === catId);
    if (selectedCategoryId === catId) {
      // Deselect
      setSelectedCategoryId(null);
      setTempFilters({ ...tempFilters, profession: '' });
    } else {
      setSelectedCategoryId(catId);
      // If no subcategories, directly set as filter
      if (!cat?.children || cat.children.length === 0) {
        setTempFilters({ ...tempFilters, profession: `cat_${catId}` });
      } else {
        // Just show subcategories, don't set filter yet
        setTempFilters({ ...tempFilters, profession: `cat_${catId}` });
      }
    }
  };

  const handleSubcategorySelect = (subId: number) => {
    if (tempFilters.profession === `cat_${subId}`) {
      // Deselect subcategory, revert to parent
      setTempFilters({ ...tempFilters, profession: selectedCategoryId ? `cat_${selectedCategoryId}` : '' });
    } else {
      setTempFilters({ ...tempFilters, profession: `cat_${subId}` });
    }
  };

  const handleAgeRangeChange = (range: string) => {
    setTempFilters({ ...tempFilters, age_range: range });
  };

  const handleSalaryRangeChange = (range: string) => {
    setTempFilters({ ...tempFilters, salary_range: range });
  };

  const handleExperienceChange = (exp: string) => {
    setTempFilters({ ...tempFilters, experience: exp });
  };

  const isVacancyFilter = activeSection === "vacancies";
  const isWorkerFilter = activeSection === "workers" || activeSection === "daily-workers";

  // Get currently selected category for subcategory display
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-end">
      <div 
        className="w-full rounded-t-3xl px-5 py-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
            {t('filters.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearFilters}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--accent)' }}
            >
              {t('filters.clear') || 'Tozalash'}
            </button>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                   style={{ color: 'var(--text-secondary)' }}>
              {t('common.search')}
            </label>
            <input
              type="text"
              value={tempFilters.search || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, search: e.target.value })}
              placeholder={t('common.search')}
              className="w-full p-3.5 rounded-xl text-sm font-medium outline-none transition-all"
              style={{ 
                backgroundColor: 'var(--bg-muted)', 
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Region */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                   style={{ color: 'var(--text-secondary)' }}>
              {t('filters.region')}
            </label>
            <SearchableSelect
              label=""
              options={regionOptions}
              value={tempFilters.region}
              onChange={(val) => setTempFilters({ ...tempFilters, region: val as string })}
              onSearch={onRegionSearch}
              loading={isRegionLoading}
              placeholder={t('filters.all_regions')}
            />
          </div>

          {/* Category Selection - Two Level */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                   style={{ color: 'var(--text-secondary)' }}>
              {t('filters.category') || 'Kategoriya'}
            </label>
            
            {isCatLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-2">
                {/* Top-level category chips */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const iconInfo = getProfessionIcon(cat);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                          isSelected ? 'shadow-md' : ''
                        }`}
                        style={{
                          backgroundColor: isSelected ? iconInfo.color : 'var(--bg-muted)',
                          borderColor: isSelected ? iconInfo.color : 'var(--border-primary)',
                          color: isSelected ? '#fff' : 'var(--text-primary)'
                        }}
                      >
                        <i className={`fa-solid ${iconInfo.icon} text-[10px]`} />
                        {getLocalizedName(cat)}
                        {cat.children && cat.children.length > 0 && (
                          <span className={`text-[9px] ${isSelected ? 'opacity-80' : ''}`}>
                            ({cat.children.length})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Subcategories - shown when a category with children is selected */}
                {selectedCategory && selectedCategory.children && selectedCategory.children.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      {getLocalizedName(selectedCategory)} → {t('filters.subcategories') || 'Subkategoriyalar'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCategory.children.map((sub) => {
                        const isSubSelected = tempFilters.profession === `cat_${sub.id}`;
                        const subIcon = getProfessionIcon(sub);
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSubcategorySelect(sub.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95`}
                            style={{
                              backgroundColor: isSubSelected ? subIcon.color : 'var(--bg-card)',
                              borderColor: isSubSelected ? subIcon.color : 'var(--border-primary)',
                              color: isSubSelected ? '#fff' : 'var(--text-secondary)'
                            }}
                          >
                            <i className={`fa-solid ${subIcon.icon} text-[9px]`} />
                            {getLocalizedName(sub)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Profession (individual) - fallback for direct profession search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                   style={{ color: 'var(--text-secondary)' }}>
              {t('filters.profession')}
            </label>
            <SearchableSelect
              label=""
              options={professionOptions}
              value={String(tempFilters.profession || '').startsWith('cat_') ? '' : tempFilters.profession}
              onChange={(val) => {
                setTempFilters({ ...tempFilters, profession: val as string });
                if (val) setSelectedCategoryId(null); // Clear category selection when profession directly selected
              }}
              onSearch={onProfessionSearch}
              loading={isProfLoading}
              placeholder={t('filters.all_professions')}
            />
          </div>

          {/* Gender - for resumes/workers */}
          {isWorkerFilter && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                     style={{ color: 'var(--text-secondary)' }}>
                {t('filters.gender_preference')}
              </label>
              <div className="flex gap-2">
                {['all', Gender.MALE, Gender.FEMALE].map((g) => (
                  <button
                    key={g}
                    onClick={() => setTempFilters({ ...tempFilters, gender: g as any })}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      tempFilters.gender === g || (g === 'all' && tempFilters.gender === 'all')
                        ? 'text-white shadow-md' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: tempFilters.gender === g || (g === 'all' && tempFilters.gender === 'all')
                        ? 'var(--accent)' 
                        : 'var(--bg-card)',
                      borderColor: tempFilters.gender === g || (g === 'all' && tempFilters.gender === 'all')
                        ? 'var(--accent)' 
                        : 'var(--border-primary)',
                      color: tempFilters.gender === g || (g === 'all' && tempFilters.gender === 'all')
                        ? 'var(--text-inverse)' 
                        : 'var(--text-primary)'
                    }}
                  >
                    {t(`filters.gender.${g}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Age Range - for resumes */}
          {isWorkerFilter && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                     style={{ color: 'var(--text-secondary)' }}>
                {t('filters.age_range')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['18-25', '26-35', '36-45', '46+'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleAgeRangeChange(tempFilters.age_range === range ? '' : range)}
                    className={`py-2.5 px-3 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      tempFilters.age_range === range
                        ? 'text-white shadow-md' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: tempFilters.age_range === range
                        ? 'var(--accent)' 
                        : 'var(--bg-card)',
                      borderColor: tempFilters.age_range === range
                        ? 'var(--accent)' 
                        : 'var(--border-primary)',
                      color: tempFilters.age_range === range
                        ? 'var(--text-inverse)' 
                        : 'var(--text-primary)'
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Salary Range - for vacancies */}
          {isVacancyFilter && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                     style={{ color: 'var(--text-secondary)' }}>
                {t('filters.salary_range')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['1-3M', '3-5M', '5-10M', '10M+'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleSalaryRangeChange(tempFilters.salary_range === range ? '' : range)}
                    className={`py-2.5 px-3 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      tempFilters.salary_range === range
                        ? 'text-white shadow-md' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: tempFilters.salary_range === range
                        ? 'var(--accent)' 
                        : 'var(--bg-card)',
                      borderColor: tempFilters.salary_range === range
                        ? 'var(--accent)' 
                        : 'var(--border-primary)',
                      color: tempFilters.salary_range === range
                        ? 'var(--text-inverse)' 
                        : 'var(--text-primary)'
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Work Format - for vacancies */}
          {isVacancyFilter && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                     style={{ color: 'var(--text-secondary)' }}>
                {t('filters.work_format')}
              </label>
              <div className="flex gap-2">
                {[WorkFormat.ONSITE, WorkFormat.REMOTE].map((format) => (
                  <button
                    key={format}
                    onClick={() => setTempFilters({ 
                      ...tempFilters, 
                      work_format: tempFilters.work_format === format ? '' : format 
                    })}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      tempFilters.work_format === format
                        ? 'text-white shadow-md' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: tempFilters.work_format === format
                        ? 'var(--accent)' 
                        : 'var(--bg-card)',
                      borderColor: tempFilters.work_format === format
                        ? 'var(--accent)' 
                        : 'var(--border-primary)',
                      color: tempFilters.work_format === format
                        ? 'var(--text-inverse)' 
                        : 'var(--text-primary)'
                    }}
                  >
                    {format === WorkFormat.ONSITE ? t('filters.work_format_options.onsite') : t('filters.work_format_options.remote')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Work Type - for vacancies */}
          {isVacancyFilter && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                     style={{ color: 'var(--text-secondary)' }}>
                {t('filters.work_type')}
              </label>
              <div className="flex gap-2">
                {[WorkType.FULLTIME, WorkType.PART_TIME].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTempFilters({ 
                      ...tempFilters, 
                      work_type: tempFilters.work_type === type ? '' : type 
                    })}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      tempFilters.work_type === type
                        ? 'text-white shadow-md' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: tempFilters.work_type === type
                        ? 'var(--accent)' 
                        : 'var(--bg-card)',
                      borderColor: tempFilters.work_type === type
                        ? 'var(--accent)' 
                        : 'var(--border-primary)',
                      color: tempFilters.work_type === type
                        ? 'var(--text-inverse)' 
                        : 'var(--text-primary)'
                    }}
                  >
                    {type === WorkType.FULLTIME ? t('filters.work_type_options.fulltime') : t('filters.work_type_options.part_time')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Experience Range */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5" 
                   style={{ color: 'var(--text-secondary)' }}>
              {t('filters.experience')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['0-1', '2-3', '4-7', '8+'].map((exp) => (
                <button
                  key={exp}
                  onClick={() => handleExperienceChange(tempFilters.experience === exp ? '' : exp)}
                  className={`py-2.5 px-3 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                    tempFilters.experience === exp
                      ? 'text-white shadow-md' 
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: tempFilters.experience === exp
                      ? 'var(--accent)' 
                      : 'var(--bg-card)',
                    borderColor: tempFilters.experience === exp
                      ? 'var(--accent)' 
                      : 'var(--border-primary)',
                    color: tempFilters.experience === exp
                      ? 'var(--text-inverse)' 
                      : 'var(--text-primary)'
                  }}
                >
                  {exp} {t('filters.years_suffix')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => {
              onClose();
              onCreateItem?.();
            }}
            className="flex-1 py-4 rounded-xl text-sm font-bold border transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-muted)', 
              borderColor: 'var(--border-primary)',
              color: 'var(--accent)'
            }}
          >
            <i className="fa-solid fa-plus text-xs"></i>
            {userRole === 'candidate_hunter' 
              ? t('client_panel.post_vacancy')
              : t('client_forms.create') + ' ' + t('common.resume')}
          </button>
          <button
            onClick={applyFilters}
            className="flex-2 py-4 px-6 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('filters.show_results')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
