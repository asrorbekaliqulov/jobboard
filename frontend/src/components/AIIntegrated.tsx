/**
 * AI Integrated Components
 * These components are embedded directly into existing UI views.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { aiService, aiAgentSearch, AgentSearchResult } from "../services/aiService.ts";
import { mainApi } from "../services/api.ts";
import { headhunterService, HHVacancy } from "../services/headhunterService.ts";
import { UserRole } from "../types.ts";

/* ═══════════════════════════════════════════════════════════════════════════════
   1. AI SEARCH RESULTS (Google-style, shows above regular results)
   ═══════════════════════════════════════════════════════════════════════════════ */
interface AISearchResultsProps {
  searchText: string;
  userRole: UserRole;
}

export const AISearchResults: React.FC<AISearchResultsProps> = ({ searchText, userRole }) => {
  const { t } = useTranslation();
  const [results, setResults] = useState<AgentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searched, setSearched] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchText.trim().length < 3) {
        setResults([]);
        setSearched("");
        setSummary("");
        return;
      }
      if (searchText === searched) return;
      setLoading(true);
      try {
        const role = userRole === UserRole.CANDIDATE_HUNTER ? "candidate_hunter" : "job_seeker";
        const r = await aiAgentSearch({ query: searchText, role, limit: 8 });
        setResults(r.items || []);
        setSummary(r.summary || "");
        setSearched(searchText);
      } catch (e) {
        console.error("AI agent search failed:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchText, userRole]);

  if (!searchText.trim() || searchText.trim().length < 3) return null;
  if (loading) {
    return (
      <div className="p-3 rounded-2xl border border-indigo-100 mb-3" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>AI qidirmoqda...</span>
        </div>
      </div>
    );
  }
  if (results.length === 0 && searched) return null;
  if (results.length === 0) return null;

  const displayResults = showAll ? results : results.slice(0, 2);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <i className="fa-solid fa-robot text-xs text-indigo-500" />
        <span className="text-[11px] font-bold text-indigo-600">AI natijalar</span>
        {summary && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>— {summary}</span>}
        <div className="flex-1 h-px bg-indigo-100" />
      </div>
      {displayResults.map((item, i: number) => (
        <div key={i} className="p-3 rounded-xl border border-indigo-100" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {item.subtitle} • {item.region}
                {item.salary && ` • ${item.salary} so'm`}
              </p>
              {item.reason && <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{item.reason}</p>}
            </div>
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 shrink-0">
              {item.score}%
            </span>
          </div>
        </div>
      ))}
      {results.length > 2 && !showAll && (
        <button onClick={() => setShowAll(true)}
          className="w-full py-2.5 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-600 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'var(--bg-card)' }}>
          Ko'proq ko'rish ({results.length - 2} ta yana) <i className="fa-solid fa-chevron-down ml-1 text-[9px]" />
        </button>
      )}
      {showAll && results.length > 2 && (
        <button onClick={() => setShowAll(false)}
          className="w-full py-2 text-[11px] font-medium text-indigo-400">
          Yopish <i className="fa-solid fa-chevron-up ml-1 text-[8px]" />
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   2. HEADHUNTER VACANCY CARD (reddish border, mixed into list)
   ═══════════════════════════════════════════════════════════════════════════════ */
export const HHVacancyCard: React.FC<{ vacancy: HHVacancy }> = ({ vacancy }) => {
  return (
    <a href={vacancy.url} target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl border-2 p-4 transition-all active:scale-[0.98]"
      style={{ borderColor: '#d6336c50', backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#d6336c15' }}>
          <i className="fa-solid fa-globe text-lg" style={{ color: '#d6336c' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-[15px] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{vacancy.title}</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{vacancy.company_name}</p>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: '#d6336c15', color: '#d6336c' }}>hh.uz</span>
          </div>
          {vacancy.region && (
            <div className="flex items-center gap-1 mt-1">
              <i className="fa-solid fa-location-dot text-[9px]" style={{ color: '#d6336c80' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{vacancy.region}</span>
            </div>
          )}
        </div>
      </div>
      {/* Salary */}
      {(vacancy.salary_from || vacancy.salary_till) && (
        <div className="mt-3">
          <span className="text-[15px] font-bold" style={{ color: '#d6336c' }}>
            {vacancy.salary_from?.toLocaleString()}{vacancy.salary_from && vacancy.salary_till && ' – '}{vacancy.salary_till?.toLocaleString()} {vacancy.salary_currency}
          </span>
        </div>
      )}
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-3">
        {vacancy.experience && <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: '#d6336c10', color: '#d6336c' }}>{vacancy.experience}</span>}
        {vacancy.employment_type && <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>{vacancy.employment_type}</span>}
        <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold ml-auto flex items-center gap-1" style={{ color: '#d6336c80' }}>
          <i className="fa-solid fa-external-link text-[8px]" /> hh.uz
        </span>
      </div>
      {vacancy.description_short && (
        <p className="text-[11px] mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{vacancy.description_short}</p>
      )}
    </a>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   HH VACANCIES LOADER (fetches and provides HH vacancies to parent)
   ═══════════════════════════════════════════════════════════════════════════════ */
export function useHHVacancies(searchText: string) {
  const [hhVacancies, setHhVacancies] = useState<HHVacancy[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await headhunterService.searchVacancies({ query: searchText || undefined, per_page: 5 });
        if (!cancelled) setHhVacancies(r.items || []);
      } catch { if (!cancelled) setHhVacancies([]); }
    };
    load();
    return () => { cancelled = true; };
  }, [searchText]);

  return hhVacancies;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3. AI JOB WRITER SECTION (at top of vacancy/resume form)
   ═══════════════════════════════════════════════════════════════════════════════ */
interface AIWriterProps {
  type: "vacancy" | "resume";
  onGenerated: (data: any) => void;
  userRole?: UserRole;
}

export const AIWriterSection: React.FC<AIWriterProps> = ({ type, onGenerated, userRole }) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Pre-fill form from saved bot profile (info user shared with bot)
  useEffect(() => {
    if (type !== "resume" || profileLoaded) return;
    const token = localStorage.getItem("auth_token");
    fetch(`${mainApi}/api/v1/ai/my-profile`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((p) => {
        if (p?.has_profile) {
          const fill: any = {};
          if (p.first_name) fill.first_name = p.first_name;
          if (p.last_name) fill.last_name = p.last_name;
          if (p.age) fill.age = p.age;
          if (p.gender) fill.gender = p.gender;
          if (p.phone) fill.phone = p.phone;
          if (p.experience_years != null) fill.experience = p.experience_years;
          if (p.about) fill.description = p.about;
          if (Object.keys(fill).length > 0) onGenerated(fill);
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, [type, profileLoaded]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (type === "vacancy") {
        const r = await aiService.writeJobPost({ simple_text: text });
        onGenerated({
          description: r.description,
          salary_from: r.suggested_salary_from,
          salary_till: r.suggested_salary_till,
          profession_id: r.suggested_profession_id,
          work_hours: r.suggested_work_hours,
        });
      } else {
        const r = await aiService.buildResume({ simple_text: text });
        // Fill ALL form fields from AI response
        const formFields: any = {
          description: r.formatted_resume_text,
        };
        if (r.suggested_profession_id) formFields.profession_id = r.suggested_profession_id;
        if (r.first_name) formFields.first_name = r.first_name;
        if (r.last_name) formFields.last_name = r.last_name;
        if (r.age) formFields.age = r.age;
        if (r.experience !== undefined && r.experience !== null) formFields.experience = r.experience;
        if (r.gender) formFields.gender = r.gender;
        if (r.phone) formFields.phone = r.phone;
        if (r.telegram) formFields.telegram = r.telegram;
        onGenerated(formFields);
      }
      setCollapsed(true);
    } catch (e: any) {
      setError(e.message || "AI xizmatida xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)}
        className="w-full p-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-xs font-semibold mb-4 active:scale-[0.98] transition-all"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
        <i className="fa-solid fa-robot" /> AI yordamida qayta yozish
      </button>
    );
  }

  const isResume = type === "resume";
  const placeholder = isResume
    ? "Masalan: Men elektrikman, 5 yil staj bor, Toshkentda ishlayman"
    : "Masalan: Kafega tajribali oshpaz kerak, maosh 5-7 million";
  const title = isResume
    ? "Rezyumengizni tariflab bering — AI chiroyli CV yaratib beradi"
    : "Vakansiyangizni tariflab bering — AI professional e'lon yaratib beradi";

  return (
    <div className="mb-5 p-4 rounded-2xl border" style={{ borderColor: 'var(--accent)30', backgroundColor: 'var(--accent)05' }}>
      <div className="flex items-center gap-2 mb-2">
        <i className="fa-solid fa-wand-magic-sparkles text-sm" style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>AI Yordamchi</span>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full p-3 rounded-xl border text-sm resize-none mb-2"
        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
      />
      <button onClick={handleGenerate} disabled={loading || !text.trim()}
        className="w-full py-2.5 rounded-xl text-white font-bold text-xs disabled:opacity-50 active:scale-[0.97] transition-all"
        style={{ backgroundColor: 'var(--accent)' }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AI yozmoqda...
          </span>
        ) : (
          <><i className="fa-solid fa-wand-magic-sparkles mr-2" />E'lon yaratish</>
        )}
      </button>
      {error && <p className="text-[10px] text-red-500 mt-2">{error}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   4. AI BANNER (role-based - "AI sizga mos ish/ishchi topdi")
   ═══════════════════════════════════════════════════════════════════════════════ */
interface AIBannerProps {
  role: UserRole;
  userName?: string;
  onPress: () => void;
}

export const AIBanner: React.FC<AIBannerProps> = ({ role, userName, onPress }) => {
  const isEmployer = role === UserRole.CANDIDATE_HUNTER;
  const bannerTitle = isEmployer
    ? "AI sizga mos ishchi topdi!"
    : "AI sizga mos ish topdi!";
  const bannerSubtitle = isEmployer
    ? "Bazadagi eng mos nomzodlarni ko'ring"
    : "Sizning profilingizga mos vakansiyalar";

  return (
    <button onClick={onPress}
      className="w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-all"
      style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 40%, #818CF8 100%)' }}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-4 w-16 h-16 bg-white/5 rounded-full translate-y-1/2" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <i className="fa-solid fa-robot text-white/80 text-sm" />
          <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">AI Yordamchi</span>
        </div>
        <h3 className="text-white font-bold text-[15px] leading-tight">{bannerTitle}</h3>
        <p className="text-white/70 text-[11px] mt-1">{bannerSubtitle}</p>
        <div className="flex items-center gap-1 mt-3 text-white/90 text-xs font-semibold">
          Ko'rish <i className="fa-solid fa-chevron-right text-[9px]" />
        </div>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   5. TRANSLATE BUTTON (for vacancy cards)
   ═══════════════════════════════════════════════════════════════════════════════ */
interface TranslateButtonProps {
  text: string;
  targetLang?: string;
  onTranslated: (translated: string) => void;
}

export const TranslateButton: React.FC<TranslateButtonProps> = ({ text, targetLang, onTranslated }) => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translated) return;
    setLoading(true);
    try {
      const target = targetLang || (i18n.language === "uz" ? "ru" : "uz");
      const r = await aiService.translate({ text, target_language: target, clean_dialect: false });
      onTranslated(r.translated_text);
      setTranslated(true);
    } catch (e) {
      console.error("Translation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleTranslate} disabled={loading || translated}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 disabled:opacity-50"
      style={{ borderColor: 'var(--border-primary)', color: translated ? '#16a34a' : 'var(--text-muted)', backgroundColor: 'var(--bg-muted)' }}>
      {loading ? (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : translated ? (
        <i className="fa-solid fa-check text-green-500" />
      ) : (
        <i className="fa-solid fa-language" />
      )}
      {translated ? "Tarjima qilindi" : "Tarjima"}
    </button>
  );
};
