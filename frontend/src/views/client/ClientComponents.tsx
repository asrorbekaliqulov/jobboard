import React, { useState, useEffect } from "react";
import { Vacancy, Resume, ItemStatus } from "../../types.ts";
import RichTextDisplay from "../../components/RichTextDisplay.tsx";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import { vacancyService } from "../../services/vacancyService.ts";
import { resumeService } from "../../services/resumeService.ts";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const getLocalizedName = (item: any) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const lang = i18n.language.split("-")[0];
  return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz || item.name;
};

const formatSalary = (amount?: number) => {
  if (amount === undefined || amount === null) return null;
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getRelativeTime = (dateStr: string, t: any): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("time.just_now");
  if (diffMins < 60) return t("time.minutes_ago", { count: diffMins });
  if (diffHours < 24) return t("time.hours_ago", { count: diffHours });
  if (diffDays < 7) return t("time.days_ago", { count: diffDays });
  if (diffDays < 30) return t("time.weeks_ago", { count: Math.floor(diffDays / 7) });
  return date.toLocaleDateString(i18n.language);
};

const isNew = (dateStr: string): boolean => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 86400000;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   VACANCY EXPLORER CARD - Redesigned to match ISHKO'P mockup
   ═══════════════════════════════════════════════════════════════════════════════ */
export const ClientVacancyExplorerCard: React.FC<{
  vacancy: Vacancy;
  isSaved: boolean;
  onToggleSave?: (id: number) => void;
  index?: number;
}> = ({ vacancy, isSaved, onToggleSave, index = 0 }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookmarkAnim, setBookmarkAnim] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      vacancyService.registerView(vacancy.id).catch(console.error);
    }
  }, [isExpanded, vacancy.id]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkAnim(true);
    setTimeout(() => setBookmarkAnim(false), 400);
    onToggleSave?.(vacancy.id);
  };

  const itemIsNew = vacancy.created_at && isNew(vacancy.created_at);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 card-shadow transition-all duration-300 card-interactive card-enter card-enter-${Math.min(index + 1, 5)} ${
        isExpanded ? "ring-1 ring-indigo-100 shadow-md" : "hover:shadow-md"
      }`}
    >
      <div className="cursor-pointer p-4" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Top row: Company logo + title + bookmark */}
        <div className="flex items-start gap-3">
          {/* Company avatar */}
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-building text-lg text-indigo-500" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-[15px] text-slate-900 leading-tight truncate">
                  {getLocalizedName(vacancy.profession)}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {vacancy.company_name}
                </p>
              </div>
              {/* NEW badge */}
              {itemIsNew && (
                <span className="shrink-0 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded-md uppercase">
                  NEW
                </span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 mt-1">
              <i className="fa-solid fa-location-dot text-[9px] text-indigo-400" />
              <span className="text-[11px] text-slate-500 font-medium">
                {getLocalizedName(vacancy.region)}
              </span>
            </div>
          </div>

          {/* Bookmark */}
          {onToggleSave && (
            <button
              onClick={handleBookmark}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                bookmarkAnim ? "bookmark-pop" : ""
              } ${
                isSaved
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-50 text-slate-300 hover:text-slate-400"
              }`}
            >
              <i className={`fa-${isSaved ? "solid" : "regular"} fa-bookmark text-sm`} />
            </button>
          )}
        </div>

        {/* Salary */}
        <div className="mt-3">
          <span className="text-[15px] font-bold text-slate-900">
            {vacancy.salary_from || vacancy.salary_till
              ? vacancy.salary_from && vacancy.salary_till
                ? `${formatSalary(vacancy.salary_from)} – ${formatSalary(vacancy.salary_till)} so'm`
                : vacancy.salary_from
                  ? `${formatSalary(vacancy.salary_from)} so'mdan`
                  : `${formatSalary(vacancy.salary_till)} so'mgacha`
              : t("vacancy_card.negotiable")}
          </span>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-600">
            {t(`client_forms.work_format_options.${vacancy.work_format.toLowerCase()}`)}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-600">
            {t(`client_forms.work_type_options.${vacancy.work_type.toLowerCase()}`)}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-500 ml-auto flex items-center gap-1">
            <i className="fa-regular fa-clock text-[9px]" />
            {vacancy.created_at ? getRelativeTime(vacancy.created_at, t) : ""}
          </span>
        </div>
      </div>

      {/* ─── Expanded Content ───────────────────────────────────────────── */}
      <div className={`overflow-hidden transition-all duration-400 ease-in-out ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 pb-4 pt-2 border-t border-slate-50 space-y-4 fade-up">
          {/* Description */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ish haqida ma'lumot</p>
            <RichTextDisplay content={vacancy.description} className="text-[13px] text-slate-600 font-medium leading-relaxed" />
          </div>

          {/* Requirements */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Talablar</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-check text-[10px] text-indigo-500 mt-1" />
                <span className="text-xs text-slate-600">Tajriba: {vacancy.exp_from}-{vacancy.exp_till} yil</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-check text-[10px] text-indigo-500 mt-1" />
                <span className="text-xs text-slate-600">Jadval: {vacancy.schedule}</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-check text-[10px] text-indigo-500 mt-1" />
                <span className="text-xs text-slate-600">Ish soati: {vacancy.work_hours} soat/hafta</span>
              </div>
            </div>
          </div>

          {/* Work conditions */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ish sharoitlari</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <i className="fa-regular fa-clock text-xs text-slate-400" />
                <span className="text-xs text-slate-600">Ish vaqti: {vacancy.schedule}</span>
              </div>
              {vacancy.region && (
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-location-dot text-xs text-slate-400" />
                  <span className="text-xs text-slate-600">Manzil: {getLocalizedName(vacancy.region)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kontaktlar</p>
            {vacancy.phone && (
              <a href={`tel:${vacancy.phone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-phone text-xs" />
                </div>
                <span className="text-xs font-bold text-slate-800">{vacancy.phone}</span>
              </a>
            )}
            {vacancy.telegram && (
              <a href={`https://t.me/${vacancy.telegram.replace("@", "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-sky-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                  <i className="fa-brands fa-telegram text-sm" />
                </div>
                <span className="text-xs font-bold text-slate-800">{vacancy.telegram}</span>
              </a>
            )}
          </div>

          {/* Apply button */}
          <button className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-indigo-100">
            Rezyume yuborish
            <i className="fa-solid fa-paper-plane text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   VACANCY OWNER CARD
   ═══════════════════════════════════════════════════════════════════════════════ */
export const ClientVacancyOwnerCard: React.FC<{
  vacancy: Vacancy;
  onEdit: (v: Vacancy) => void;
  onDelete: (id: number) => void;
  index?: number;
}> = ({ vacancy, onEdit, onDelete, index = 0 }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = vacancy.status === ItemStatus.ACTIVE
    ? "bg-emerald-50 text-emerald-600"
    : vacancy.status === ItemStatus.ARCHIVED
      ? "bg-amber-50 text-amber-600"
      : "bg-slate-100 text-slate-500";

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 card-shadow transition-all duration-300 card-interactive card-enter card-enter-${Math.min(index + 1, 5)} ${
      isExpanded ? "ring-1 ring-indigo-100 shadow-md" : ""
    }`}>
      <div className="cursor-pointer p-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-briefcase text-lg text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-slate-900 leading-tight truncate">
              {getLocalizedName(vacancy.profession)}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{vacancy.company_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusColor}`}>
                {t(`client_forms.status.${vacancy.status}`)}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <i className="fa-solid fa-eye text-[8px]" /> {vacancy.viewed_count}
              </span>
            </div>
          </div>
          <i className={`fa-solid fa-chevron-down text-xs text-slate-300 transition-transform duration-300 mt-2 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <div className="mt-3">
          <span className="text-sm font-bold text-slate-800">
            {vacancy.salary_from || vacancy.salary_till
              ? `${formatSalary(vacancy.salary_from)} – ${formatSalary(vacancy.salary_till)} so'm`
              : t("vacancy_card.negotiable")}
          </span>
        </div>

        <div className="flex items-center pt-2">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <i className="fa-regular fa-clock text-[9px]" />
            {vacancy.created_at ? getRelativeTime(vacancy.created_at, t) : ""}
          </span>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-400 ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 pb-3 pt-2 border-t border-slate-50 fade-up">
          <RichTextDisplay content={vacancy.description} className="text-[13px] text-slate-600 font-medium leading-relaxed" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(vacancy); }}
          className="flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors active:scale-95"
        >
          <i className="fa-solid fa-pen text-[10px]" /> {t("client_forms.edit")}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(vacancy.id); }}
          className="w-12 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
        >
          <i className="fa-solid fa-trash text-xs" />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   RESUME EXPLORER CARD
   ═══════════════════════════════════════════════════════════════════════════════ */
export const ClientResumeExplorerCard: React.FC<{
  resume: Resume;
  isSaved: boolean;
  onToggleSave?: (id: number) => void;
  index?: number;
}> = ({ resume, isSaved, onToggleSave, index = 0 }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookmarkAnim, setBookmarkAnim] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      resumeService.registerView(resume.id).catch(console.error);
    }
  }, [isExpanded, resume.id]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkAnim(true);
    setTimeout(() => setBookmarkAnim(false), 400);
    onToggleSave?.(resume.id);
  };

  const itemIsNew = resume.created_at && isNew(resume.created_at);

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 card-shadow transition-all duration-300 card-interactive card-enter card-enter-${Math.min(index + 1, 5)} ${
      isExpanded ? "ring-1 ring-indigo-100 shadow-md" : "hover:shadow-md"
    }`}>
      <div className="cursor-pointer p-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-user text-lg text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-[15px] text-slate-900 leading-tight truncate">
                  {resume.first_name} {resume.last_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {getLocalizedName(resume.profession)}
                </p>
              </div>
              {itemIsNew && (
                <span className="shrink-0 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded-md uppercase">
                  NEW
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <i className="fa-solid fa-location-dot text-[9px] text-indigo-400" />
              <span className="text-[11px] text-slate-500 font-medium">{getLocalizedName(resume.region)}</span>
            </div>
          </div>
          {onToggleSave && (
            <button
              onClick={handleBookmark}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${bookmarkAnim ? "bookmark-pop" : ""} ${
                isSaved ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-300 hover:text-slate-400"
              }`}
            >
              <i className={`fa-${isSaved ? "solid" : "regular"} fa-bookmark text-sm`} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-600">
            {resume.experience} yil tajriba
          </span>
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-600">
            {resume.age} yosh
          </span>
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-600">
            {t(`gender.${resume.gender}`)}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-500 ml-auto flex items-center gap-1">
            <i className="fa-regular fa-clock text-[9px]" />
            {resume.created_at ? getRelativeTime(resume.created_at, t) : ""}
          </span>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-400 ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 pb-4 pt-2 border-t border-slate-50 space-y-4 fade-up">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nomzod haqida</p>
            <RichTextDisplay content={resume.description} className="text-[13px] text-slate-600 font-medium leading-relaxed" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kontaktlar</p>
            {resume.phone && (
              <a href={`tel:${resume.phone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-phone text-xs" />
                </div>
                <span className="text-xs font-bold text-slate-800">{resume.phone}</span>
              </a>
            )}
            {resume.telegram && (
              <a href={`https://t.me/${resume.telegram.replace("@", "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-sky-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                  <i className="fa-brands fa-telegram text-sm" />
                </div>
                <span className="text-xs font-bold text-slate-800">{resume.telegram}</span>
              </a>
            )}
          </div>

          {resume.portfolio && (
            <a href={resume.portfolio} target="_blank" rel="noreferrer" className="flex w-full py-3 bg-slate-900 text-white items-center justify-center rounded-xl active:scale-95 transition-all gap-2">
              <i className="fa-solid fa-paperclip text-sm" />
              <span className="text-xs font-bold uppercase tracking-wide">{t("resume_card.view_portfolio")}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   RESUME OWNER CARD
   ═══════════════════════════════════════════════════════════════════════════════ */
export const ClientResumeOwnerCard: React.FC<{
  resume: Resume;
  onEdit: (r: Resume) => void;
  onDelete: (id: number) => void;
  index?: number;
}> = ({ resume, onEdit, onDelete, index = 0 }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = resume.status === "active"
    ? "bg-emerald-50 text-emerald-600"
    : resume.status === "archived"
      ? "bg-amber-50 text-amber-600"
      : "bg-slate-100 text-slate-500";

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 card-shadow transition-all duration-300 card-interactive card-enter card-enter-${Math.min(index + 1, 5)} ${
      isExpanded ? "ring-1 ring-indigo-100 shadow-md" : ""
    }`}>
      <div className="cursor-pointer p-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-user-check text-lg text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-slate-900 leading-tight truncate">
              {resume.first_name} {resume.last_name}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{getLocalizedName(resume.profession)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusColor}`}>
                {t(`client_forms.status.${resume.status}`)}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <i className="fa-solid fa-eye text-[8px]" /> {resume.viewed_count || 0}
              </span>
            </div>
          </div>
          <i className={`fa-solid fa-chevron-down text-xs text-slate-300 transition-transform duration-300 mt-2 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
          <i className="fa-regular fa-clock text-[9px]" />
          {resume.created_at ? getRelativeTime(resume.created_at, t) : ""}
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-400 ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 pb-3 pt-2 border-t border-slate-50 fade-up">
          <RichTextDisplay content={resume.description} className="text-[13px] text-slate-600 font-medium leading-relaxed" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(resume); }}
          className="flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors active:scale-95"
        >
          <i className="fa-solid fa-pen text-[10px]" /> {t("client_forms.edit")}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
          className="w-12 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
        >
          <i className="fa-solid fa-trash text-xs" />
        </button>
      </div>
    </div>
  );
};
