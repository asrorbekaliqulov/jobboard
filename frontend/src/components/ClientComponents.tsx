import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vacancy, Resume, ItemStatus } from '../types.ts';
import RichTextDisplay from './RichTextDisplay.tsx';

const formatSalary = (amount?: number) => {
  if (amount === undefined || amount === null) return null;
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const VacancyCard: React.FC<{
  vacancy: Vacancy;
  isSaved?: boolean;
  onSaveToggle?: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (v: Vacancy) => void;
  onDelete?: (id: string) => void;
  accentColor?: string;
}> = ({ vacancy, isSaved, onSaveToggle, isOwner, onEdit, onDelete, accentColor = 'blue' }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const textClass = accentColor === 'purple' ? 'text-purple-600' : 'text-blue-600';
  const bgClass = accentColor === 'purple' ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <div className={`px-4 py-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all ${isExpanded ? 'ring-2 ring-slate-100 shadow-xl' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2">
            <h3 className={`font-black text-lg ${textClass}`}>{vacancy.company_name}</h3>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
          </div>
          <p className="text-sm font-bold text-slate-500">{vacancy.profession}</p>
        </div>
        {!isOwner && onSaveToggle && (
          <button onClick={() => onSaveToggle(vacancy.id)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSaved ? `${bgClass} text-white shadow-lg` : 'bg-slate-50 text-slate-300'}`}>
            <i className="fa-solid fa-bookmark"></i>
          </button>
        )}
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => onEdit?.(vacancy)} className="w-10 h-10 rounded-2xl bg-slate-50  hover:text-blue-500 transition-colors"><i className="fa-solid fa-pen-to-square"></i></button>
            <button onClick={() => onDelete?.(vacancy.id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500"><i className="fa-solid fa-trash-can"></i></button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">{vacancy.region}</span>
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">{vacancy.work_format}</span>
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">
          {vacancy.salary_from || vacancy.salary_till ? (
            vacancy.salary_from && vacancy.salary_till
              ? `${formatSalary(vacancy.salary_from)} - ${formatSalary(vacancy.salary_till)}`
              : vacancy.salary_from
                ? `${formatSalary(vacancy.salary_from)} +`
                : `${formatSalary(vacancy.salary_till)}`
          ) : t('vacancy_card.negotiable')}
        </span>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pt-4 border-t border-slate-50 mt-4 space-y-4">
          <RichTextDisplay content={vacancy.description} className="text-sm text-slate-600 font-medium leading-relaxed" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-3xl">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-1">{t('vacancy_card.schedule')}</p>
              <p className="text-xs font-bold text-slate-900">{vacancy.schedule} ({vacancy.work_hours}h)</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl">
              <p className="text-[10px] font-black  uppercase tracking-widest mb-1">{t('vacancy_card.experience')}</p>
              <p className="text-xs font-bold text-slate-900">{vacancy.exp_from}-{vacancy.exp_till}y</p>
            </div>
          </div>
          <div className="flex gap-4">
            <a href={`tel:${vacancy.phone}`} className="flex-1 py-4 bg-slate-900 text-white text-center rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">{t('vacancy_card.call')}</a>
            <a href={`https://t.me/${vacancy.telegram.replace('@', '')}`} target="_blank" className="flex-1 py-4 bg-sky-500 text-white text-center rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">{t('vacancy_card.telegram')}</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResumeCard: React.FC<{
  resume: Resume;
  isSaved?: boolean;
  onSaveToggle?: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (r: Resume) => void;
  onDelete?: (id: string) => void;
}> = ({ resume, isSaved, onSaveToggle, isOwner, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`px-4 py-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all ${isExpanded ? 'ring-2 ring-slate-100 shadow-xl' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-14 h-14 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xl shadow-inner">
            {resume.first_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg text-slate-900">{resume.first_name} {resume.last_name}</h3>
              <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">{resume.profession}</p>
          </div>
        </div>
        {!isOwner && onSaveToggle && (
          <button onClick={() => onSaveToggle(resume.id)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSaved ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
            <i className="fa-solid fa-bookmark"></i>
          </button>
        )}
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => onEdit?.(resume)} className="w-10 h-10 rounded-2xl bg-slate-50  hover:text-purple-500 transition-colors"><i className="fa-solid fa-pen-to-square"></i></button>
            <button onClick={() => onDelete?.(resume.id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500"><i className="fa-solid fa-trash-can"></i></button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">{resume.region}</span>
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">{t('resume_card.experience_years', { count: resume.experience })}</span>
        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black  uppercase tracking-widest">{t('resume_card.years_old', { count: resume.age })}</span>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pt-4 border-t border-slate-50 mt-4 space-y-4">
          <RichTextDisplay content={resume.description} className="text-sm text-slate-600 font-medium leading-relaxed" />
          <div className="flex gap-4">
            <a href={`https://t.me/${resume.telegram.replace('@', '')}`} target="_blank" className="flex-1 py-4 bg-purple-600 text-white text-center rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">{t('resume_card.telegram_chat')}</a>
          </div>
        </div>
      </div>
    </div>
  );
};
