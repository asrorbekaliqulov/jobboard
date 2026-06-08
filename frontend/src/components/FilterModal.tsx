import React from 'react';
import { useTranslation } from 'react-i18next';
import { Filters, Gender } from '../types.ts';
import { MOCK_REGIONS, MOCK_PROFESSIONS } from '../constants.ts';

interface FilterModalProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ filters, setFilters, onClose }) => {
  const { t, i18n } = useTranslation();

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    const lang = i18n.language.split('-')[0];
    // @ts-ignore
    return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz || item.name;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end fade-up">
      <div className="bg-white w-full rounded-t-3xl px-5 py-6 max-h-[80vh] overflow-y-auto slide-up-modal">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold text-slate-900">{t('filters.title')}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors active:scale-90">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="space-y-5">
          {/* Region */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">{t('filters.region')}</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="w-full border border-slate-100 rounded-xl p-3.5 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all appearance-none"
            >
              <option value="">{t('filters.all_regions')}</option>
              {MOCK_REGIONS.map((r) => <option key={r.id} value={r.id}>{getLocalizedName(r)}</option>)}
            </select>
          </div>

          {/* Profession */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">{t('filters.profession')}</label>
            <select
              value={filters.profession}
              onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
              className="w-full border border-slate-100 rounded-xl p-3.5 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all appearance-none"
            >
              <option value="">{t('filters.all_professions')}</option>
              {MOCK_PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{getLocalizedName(p)}</option>)}
            </select>
          </div>

          {/* Gender chips */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">{t('filters.gender_preference')}</label>
            <div className="flex gap-2">
              {['all', Gender.MALE, Gender.FEMALE, Gender.ANY].map((g) => (
                <button
                  key={g}
                  onClick={() => setFilters({ ...filters, gender: g as any })}
                  className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                    filters.gender === g || (g === 'all' && (filters.gender as any) === 'All')
                      ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-100'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  {t(`gender.${g.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={onClose}
          className="w-full btn-gradient text-white font-bold text-sm py-4 rounded-xl mt-8 shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
        >
          {t('filters.show_results')}
        </button>
      </div>
    </div>
  );
};

export default FilterModal;
