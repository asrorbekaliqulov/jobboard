import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resume } from '../types.ts';
import RichTextDisplay from './RichTextDisplay.tsx';

interface ResumeCardProps {
  resume: Resume;
  isSaved: boolean;
  onSaveToggle: (id: string) => void;
  onViewContact: (resume: Resume) => void;
  showActions?: boolean;
  onDelete?: (id: string) => void;
}

const ResumeCard: React.FC<ResumeCardProps> = ({ resume, isSaved, onSaveToggle, onViewContact, showActions = false, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  // Fix: Use 'first_name' and 'last_name' instead of camelCase
  const fullName = `${resume.first_name} ${resume.last_name}`;

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    // Handle string case for backward compatibility or simplistic mocks
    if (typeof item === 'string') return item;

    const lang = i18n.language.split('-')[0];
    // @ts-ignore
    return (item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz);
  };

  const professionName = getLocalizedName(resume.profession.name_ru);
  const regionName = getLocalizedName(resume.region.name_ru);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`p-5 rounded-3xl bg-white border border-gray-100 shadow-sm transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : 'hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transform rotate-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            {/* Fix: Use 'first_name' instead of 'firstName' */}
            <span className="-rotate-3">{resume.first_name.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg leading-tight text-gray-900">{fullName}</h3>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">{professionName}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {!showActions && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveToggle(resume.id); }}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${isSaved ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'
                }`}
            >
              <i className="fa-solid fa-bookmark"></i>
            </button>
          )}
          {showActions && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-all active:scale-90"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] font-black uppercase tracking-normal mb-5 text-gray-400">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-location-dot w-4 text-blue-400"></i> {regionName}
        </div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-clock w-4 text-blue-400"></i> {t('resume_card.experience_years', { count: resume.experience })}
        </div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-user w-4 text-blue-400"></i> {t(`gender.${resume.gender.toLowerCase()}`)}, {t('resume_card.years_old', { count: resume.age })}
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-12 opacity-80'}`}>
        <RichTextDisplay
          content={resume.description}
          className={`text-sm leading-relaxed font-medium text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}
        />

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {(resume.email || resume.telegram) && (
              <div className="flex flex-wrap gap-3">
                {resume.telegram && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600">
                    <i className="fa-brands fa-telegram"></i> {resume.telegram}
                  </div>
                )}
                {resume.email && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                    <i className="fa-solid fa-envelope"></i> {resume.email}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={(e) => { e.stopPropagation(); onViewContact(resume); }}
          className="block w-full text-center py-4 rounded-2xl text-sm font-black bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          {t('resume_card.get_contacts')}
        </button>
      </div>
    </div>
  );
};

export default ResumeCard;
