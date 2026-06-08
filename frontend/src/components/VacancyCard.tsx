import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vacancy } from '../types.ts';
import RichTextDisplay from './RichTextDisplay.tsx';
import i18n from '@/i18n.ts';

interface VacancyCardProps {
  vacancy: Vacancy;
  isSaved: boolean;
  onSaveToggle: (id: string) => void;
  onViewContact: (vacancy: Vacancy) => void;
  showActions?: boolean;
  onDelete?: (id: string) => void;
}

const VacancyCard: React.FC<VacancyCardProps> = ({ vacancy, isSaved, onSaveToggle, onViewContact, showActions = false, onDelete }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getSalaryDisplay = () => {
    if (vacancy.salary_from && vacancy.salary_till) {
      return t('vacancy_card.salary_range', { from: vacancy.salary_from, till: vacancy.salary_till });
    } else if (vacancy.salary_from) {
      return t('vacancy_card.salary_from', { amount: vacancy.salary_from });
    } else if (vacancy.salary_till) {
      return t('vacancy_card.salary_up_to', { amount: vacancy.salary_till });
    }
    return t('vacancy_card.negotiable');
  };

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const lang = i18n.language.split('-')[0];
    // @ts-ignore
    return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz || item.name;
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`p-5 rounded-3xl bg-white border border-transparent gradient-border card-shadow-lg transition-all cursor-pointer card-enter card-enter-1 fade-up ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : 'hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg leading-tight text-slate-900">{getLocalizedName(vacancy.profession)}</h3>
            <i className={`fa-solid fa-chevron-down text-[10px] text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
          </div>
          <p className="text-sm font-bold text-gray-500">{vacancy.company_name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!showActions && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveToggle(vacancy.id); }}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${isSaved ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'
                }`}
            >
              <i className="fa-solid fa-bookmark"></i>
            </button>
          )}
          {showActions && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(vacancy.id); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-all active:scale-90"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] font-black text-gray-300 uppercase">
            <i className="fa-solid fa-eye text-[8px]"></i>
            {vacancy.viewed || 0}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-normal bg-gray-100 text-gray-500">
          {getLocalizedName(vacancy.region)}
        </span>
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-normal bg-gray-100 text-gray-500">
          {t(`client_forms.work_format_options.${vacancy.work_format.toLowerCase()}`)}
        </span>
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-normal bg-gray-100 text-gray-500">
          {t('vacancy_card.exp_years', { count: `${vacancy.exp_from}-${vacancy.exp_till}` })}
        </span>
        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-normal ${getSalaryDisplay() === t('vacancy_card.negotiable') ? 'bg-gray-50 text-gray-400' : 'bg-green-50 text-green-700'}`}>
          {getSalaryDisplay()}
        </span>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-12 opacity-80'}`}>
        <RichTextDisplay
          content={vacancy.description}
          className={`text-sm leading-relaxed font-medium text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}
        />

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-50 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('vacancy_card.schedule')}</p>
                <p className="text-xs font-bold text-gray-700">{vacancy.schedule} ({t('vacancy_card.work_hours_week', { count: vacancy.work_hours })})</p>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('vacancy_card.type')}</p>
                <p className="text-xs font-bold text-gray-700 capitalize">{vacancy.work_type}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('vacancy_card.direct_contacts')}</p>
              <div className="grid grid-cols-1 gap-2">
                {vacancy.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 border border-gray-100/50 rounded-2xl group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                      <i className="fa-solid fa-phone text-xs"></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">{t('vacancy_card.phone')}</span>
                      <span className="text-xs font-bold text-gray-700">{vacancy.phone}</span>
                    </div>
                  </div>
                )}
                {vacancy.telegram && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 border border-gray-100/50 rounded-2xl group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-sm">
                      <i className="fa-brands fa-telegram text-xs"></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">{t('vacancy_card.telegram')}</span>
                      <span className="text-xs font-bold text-gray-700">{vacancy.telegram}</span>
                    </div>
                  </div>
                )}
                {vacancy.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 border border-gray-100/50 rounded-2xl group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm">
                      <i className="fa-solid fa-envelope text-xs"></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">{t('vacancy_card.email')}</span>
                      <span className="text-xs font-bold text-gray-700">{vacancy.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={(e) => { e.stopPropagation(); onViewContact(vacancy); }}
          className="block w-full text-center py-4 rounded-2xl text-sm font-black btn-gradient text-white shadow-xl hover:opacity-95 active:scale-[0.98] transition-all"
        >
          {isExpanded ? t('vacancy_card.apply_now') : t('vacancy_card.view_contacts')}
        </button>
      </div>
    </div>
  );
};

export default VacancyCard;
