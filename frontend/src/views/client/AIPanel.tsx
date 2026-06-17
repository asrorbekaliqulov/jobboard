import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { aiService } from "../../services/aiService.ts";
import { headhunterService, HHVacancy } from "../../services/headhunterService.ts";

type AIFeature = 
  | "menu"
  | "worker-finder"
  | "job-writer"
  | "resume-builder"
  | "career-advisor"
  | "fraud-filter"
  | "match"
  | "translator"
  | "gig-match"
  | "interview"
  | "salary"
  | "company-trust"
  | "hh-vacancies";

const AIPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState<AIFeature>("menu");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const clearState = () => { setResult(null); setError(null); };

  const features = [
    { id: "worker-finder" as const, icon: "fa-magnifying-glass-location", title: "AI Ishchi Topuvchi", desc: "E'lon matnidan mos ishchi topadi", color: "#6366f1" },
    { id: "job-writer" as const, icon: "fa-wand-magic-sparkles", title: "AI E'lon Yozuvchi", desc: "Oddiy matndan professional e'lon", color: "#8b5cf6" },
    { id: "resume-builder" as const, icon: "fa-file-lines", title: "AI Rezyume Tuzuvchi", desc: "Professional CV yaratadi", color: "#3b82f6" },
    { id: "career-advisor" as const, icon: "fa-graduation-cap", title: "AI Kasb Maslahatchisi", desc: "Qaysi kasb sizga mos?", color: "#10b981" },
    { id: "fraud-filter" as const, icon: "fa-shield-halved", title: "AI Firibgarlik Filtri", desc: "E'lonni xavfsizlik uchun tekshiradi", color: "#ef4444" },
    { id: "match" as const, icon: "fa-handshake", title: "AI Match System", desc: "Moslik foizini hisoblaydi", color: "#f59e0b" },
    { id: "salary" as const, icon: "fa-chart-line", title: "AI Maosh Analitigi", desc: "Real bozor narxlari tahlili", color: "#06b6d4" },
    { id: "interview" as const, icon: "fa-comments", title: "AI Intervyu Simulyatori", desc: "Suhbatga tayyorlanish", color: "#ec4899" },
    { id: "translator" as const, icon: "fa-language", title: "AI Tarjimon", desc: "Tarjima + sheva tozalash", color: "#14b8a6" },
    { id: "gig-match" as const, icon: "fa-bolt", title: "AI Tezkor Ishlar", desc: "Kunlik ishchilarni topadi", color: "#f97316" },
    { id: "company-trust" as const, icon: "fa-building-shield", title: "Kompaniya Ishonchliligi", desc: "Ish beruvchi reytingi", color: "#7c3aed" },
    { id: "hh-vacancies" as const, icon: "fa-globe", title: "HeadHunter Vakansiyalar", desc: "hh.uz dan qo'shimcha ishlar", color: "#d6336c" },
  ];

  if (activeFeature === "menu") {
    return <AIMenuGrid features={features} onSelect={(id) => { clearState(); setActiveFeature(id); }} />;
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 fade-up">
      <button onClick={() => { setActiveFeature("menu"); clearState(); }}
        className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>
        <i className="fa-solid fa-arrow-left" /> Orqaga
      </button>
      {activeFeature === "worker-finder" && <WorkerFinderView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "job-writer" && <JobWriterView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "resume-builder" && <ResumeBuilderView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "career-advisor" && <CareerAdvisorView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "fraud-filter" && <FraudFilterView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "match" && <MatchView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "salary" && <SalaryView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "interview" && <InterviewView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "translator" && <TranslatorView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "gig-match" && <GigMatchView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "company-trust" && <CompanyTrustView loading={loading} setLoading={setLoading} result={result} setResult={setResult} error={error} setError={setError} />}
      {activeFeature === "hh-vacancies" && <HHVacanciesView />}
    </div>
  );
};

export default AIPanel;



// ==================== Menu Grid ====================
interface MenuProps { features: { id: AIFeature; icon: string; title: string; desc: string; color: string }[]; onSelect: (id: AIFeature) => void; }
const AIMenuGrid: React.FC<MenuProps> = ({ features, onSelect }) => (
  <div className="px-4 pt-4 pb-4 space-y-4 fade-up">
    <div className="text-center mb-4">
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        <i className="fa-solid fa-robot mr-2" style={{ color: 'var(--accent)' }} />AI Yordamchi
      </h2>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sun'iy intellekt bilan ishingizni osonlashtiring</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {features.map((f) => (
        <button key={f.id} onClick={() => onSelect(f.id)}
          className="p-4 rounded-2xl border text-left transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: f.color + '15' }}>
            <i className={`fa-solid ${f.icon}`} style={{ color: f.color }} />
          </div>
          <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

// ==================== Shared Components ====================
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
  </div>
);

const ErrorBox: React.FC<{msg: string}> = ({msg}) => (
  <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs">{msg}</div>
);

interface ViewProps { loading: boolean; setLoading: (v: boolean) => void; result: any; setResult: (v: any) => void; error: string|null; setError: (v: string|null) => void; }



// ==================== 1. Worker Finder ====================
const WorkerFinderView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [desc, setDesc] = useState("");
  const handleSubmit = async () => {
    if (!desc.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.findWorkers({ description: desc }); setResult(r); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-magnifying-glass-location mr-2 text-indigo-500" />AI Ishchi Topuvchi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Qanday ishchi kerakligini yozing, AI bazadan eng moslarini topadi</p>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Masalan: Toshkentda tajribali oshpaz kerak, 3 yillik tajriba..." rows={3}
        className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !desc.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-indigo-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Qidirilmoqda..." : "Ishchi topish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{result.search_summary}</p>
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{result.total_found} ta ishchi topildi</p>
          {result.workers?.map((w: any) => (
            <div key={w.resume_id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex justify-between items-start">
                <div><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{w.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.profession} • {w.experience} yil • {w.region}</p></div>
                <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">{w.match_score}%</span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{w.match_reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



// ==================== 2. Job Writer ====================
const JobWriterView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [text, setText] = useState("");
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.writeJobPost({ simple_text: text }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-wand-magic-sparkles mr-2 text-purple-500" />AI E'lon Yozuvchi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Oddiy gapdan professional e'lon yaratadi (1 soniyada)</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Masalan: Kafega ofitsiant kerak" rows={2}
        className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !text.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-purple-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Yaratilmoqda..." : "E'lon yaratish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.title}</h4>
          <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{result.description}</p>
          {result.suggested_requirements?.length > 0 && (
            <div><p className="text-[10px] font-bold mt-2" style={{ color: 'var(--text-muted)' }}>Talablar:</p>
              <ul className="text-xs list-disc pl-4" style={{ color: 'var(--text-secondary)' }}>{result.suggested_requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
          )}
          {(result.suggested_salary_from || result.suggested_salary_till) && (
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Maosh: {result.suggested_salary_from?.toLocaleString()} - {result.suggested_salary_till?.toLocaleString()} so'm</p>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== 3. Resume Builder ====================
const ResumeBuilderView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [text, setText] = useState("");
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.buildResume({ simple_text: text }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-file-lines mr-2 text-blue-500" />AI Rezyume Tuzuvchi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>O'zingiz haqingizda oddiy gaplar yozing, AI professional CV yaratadi</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Masalan: Men elektrikman, 5 yil staj bor, Toshkentda ishlayman" rows={3}
        className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !text.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-blue-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tuzilmoqda..." : "Rezyume yaratish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Kasb: {result.suggested_profession_name}</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{result.professional_summary}</p>
          {result.skills?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{result.skills.map((s: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">{s}</span>)}</div>}
          <div className="mt-2 p-3 rounded-lg text-xs whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>{result.formatted_resume_text}</div>
        </div>
      )}
    </div>
  );
};



// ==================== 4. Career Advisor ====================
const CareerAdvisorView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState("");
  const handleSubmit = async () => {
    if (!age || !interests.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.getCareerAdvice({ age: parseInt(age), interests: interests.split(",").map(s => s.trim()), language: "uz" }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-graduation-cap mr-2 text-emerald-500" />AI Kasb Maslahatchisi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Yoshingiz va qiziqishlaringizga qarab mos kasblarni tavsiya qiladi</p>
      <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Yoshingiz (masalan: 22)" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Qiziqishlar (vergul bilan: kompyuter, dizayn, ingliz tili)" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !age || !interests.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-emerald-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tahlil qilinmoqda..." : "Maslahat olish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="space-y-3">
          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>{result.general_advice}</p>
          {result.suggestions?.map((s: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex justify-between"><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.profession_name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.growth_potential === 'high' ? 'bg-green-100 text-green-700' : s.growth_potential === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{s.growth_potential === 'high' ? 'Yuqori' : s.growth_potential === 'medium' ? "O'rtacha" : 'Past'}</span></div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.match_reason}</p>
              {(s.estimated_salary_from || s.estimated_salary_till) && <p className="text-xs font-semibold mt-1" style={{ color: 'var(--accent)' }}>Maosh: {s.estimated_salary_from?.toLocaleString()} - {s.estimated_salary_till?.toLocaleString()} so'm</p>}
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}><b>Boshlash:</b> {s.how_to_start}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 5. Fraud Filter ====================
const FraudFilterView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [desc, setDesc] = useState("");
  const [salary, setSalary] = useState("");
  const handleSubmit = async () => {
    if (!desc.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.checkFraud({ description: desc, salary_till: salary ? parseInt(salary) : undefined }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-shield-halved mr-2 text-red-500" />AI Firibgarlik Filtri</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>E'lonni shubhali belgilar uchun tekshiring</p>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="E'lon matnini kiriting..." rows={3} className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Maosh (ixtiyoriy)" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !desc.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-red-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tekshirilmoqda..." : "Tekshirish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className={`p-4 rounded-xl border-2 space-y-2 ${result.is_suspicious ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
          <div className="flex items-center gap-2"><i className={`fa-solid ${result.is_suspicious ? 'fa-triangle-exclamation text-red-600' : 'fa-check-circle text-green-600'} text-lg`} />
            <span className="font-bold text-sm" style={{ color: result.is_suspicious ? '#dc2626' : '#16a34a' }}>{result.is_suspicious ? 'Shubhali!' : 'Xavfsiz'} ({result.risk_score}% xavf)</span></div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result.recommendation}</p>
          {result.issues?.map((issue: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${issue.severity === 'critical' ? 'bg-red-200 text-red-800' : issue.severity === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'}`}>{issue.severity}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{issue.description}</span></div>
          ))}
        </div>
      )}
    </div>
  );
};



// ==================== 6. Match System ====================
const MatchView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [resumeId, setResumeId] = useState("");
  const [vacancyId, setVacancyId] = useState("");
  const handleSubmit = async () => {
    if (!resumeId || !vacancyId) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.calculateMatch({ resume_id: parseInt(resumeId), vacancy_id: parseInt(vacancyId) }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-handshake mr-2 text-amber-500" />AI Match System</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rezyume va vakansiya mosligini foizlarda hisoblaydi</p>
      <input type="number" value={resumeId} onChange={e => setResumeId(e.target.value)} placeholder="Rezyume ID raqami" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <input type="number" value={vacancyId} onChange={e => setVacancyId(e.target.value)} placeholder="Vakansiya ID raqami" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !resumeId || !vacancyId} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-amber-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Hisoblanmoqda..." : "Moslikni hisoblash"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <div className="text-center"><span className="text-3xl font-black" style={{ color: result.overall_match >= 70 ? '#16a34a' : result.overall_match >= 40 ? '#f59e0b' : '#dc2626' }}>{result.overall_match}%</span><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Umumiy moslik</p></div>
          <div className="grid grid-cols-2 gap-2">{[{label: "Kasb", val: result.profession_match}, {label: "Tajriba", val: result.experience_match}, {label: "Hudud", val: result.location_match}, {label: "Maosh", val: result.salary_match}].map((m, i) => (
            <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{m.val}%</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p></div>
          ))}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result.explanation}</p>
        </div>
      )}
    </div>
  );
};

// ==================== 7. Salary Analytics ====================
const SalaryView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [profName, setProfName] = useState("");
  const handleSubmit = async () => {
    if (!profName.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.getSalaryAnalytics({ profession_name: profName }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-chart-line mr-2 text-cyan-500" />AI Maosh Analitigi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bazadagi real vakansiyalar asosida maosh tahlili</p>
      <input value={profName} onChange={e => setProfName(e.target.value)} placeholder="Kasb nomi (masalan: Dasturchi)" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !profName.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-cyan-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.profession_name} {result.region_name && `(${result.region_name})`}</h4>
          <div className="grid grid-cols-2 gap-2">{[{label: "Minimal", val: result.salary_data.min_salary}, {label: "Maksimal", val: result.salary_data.max_salary}, {label: "O'rtacha", val: result.salary_data.avg_salary}, {label: "Namuna", val: result.salary_data.sample_count + " ta"}].map((m, i) => (
            <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{typeof m.val === 'number' ? m.val.toLocaleString() + " so'm" : m.val}</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p></div>
          ))}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result.ai_recommendation}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{result.data_freshness}</p>
        </div>
      )}
    </div>
  );
};



// ==================== 8. Interview Simulator ====================
const InterviewView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [profName, setProfName] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);

  const handleStart = async () => {
    if (!profName.trim()) return;
    setLoading(true); setError(null); setMessages([]);
    try {
      const r = await aiService.startInterview({ profession_name: profName, difficulty: "medium", language: "uz" });
      setSessionId(r.session_id);
      setMessages([{ role: "ai", text: r.first_question }]);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAnswer = async () => {
    if (!answer.trim() || !sessionId) return;
    setMessages(prev => [...prev, { role: "user", text: answer }]);
    setLoading(true); setError(null); setAnswer("");
    try {
      const r = await aiService.answerInterview({ session_id: sessionId, answer });
      setMessages(prev => [...prev, { role: "ai", text: r.feedback }]);
      if (r.is_completed) { setResult({ completed: true, score: r.current_score }); setSessionId(null); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-comments mr-2 text-pink-500" />AI Intervyu Simulyatori</h3>
      {!sessionId && !result && (<>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI HR menejer bilan suhbat mashq qiling</p>
        <input value={profName} onChange={e => setProfName(e.target.value)} placeholder="Kasb nomi (masalan: Dasturchi)" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
        <button onClick={handleStart} disabled={loading || !profName.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-pink-600 disabled:opacity-50 active:scale-[0.97] transition-all">
          {loading ? "Tayyorlanmoqda..." : "Intervyuni boshlash"}
        </button>
      </>)}
      {sessionId && (<>
        <div className="space-y-2 max-h-64 overflow-y-auto">{messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl text-xs ${m.role === 'ai' ? 'ml-0 mr-8' : 'ml-8 mr-0'}`}
            style={{ backgroundColor: m.role === 'ai' ? 'var(--bg-muted)' : 'var(--accent)' + '20', color: 'var(--text-primary)' }}>
            <span className="font-bold text-[10px]" style={{ color: m.role === 'ai' ? '#ec4899' : 'var(--accent)' }}>{m.role === 'ai' ? 'HR:' : 'Siz:'}</span> {m.text}
          </div>
        ))}</div>
        <div className="flex gap-2">
          <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Javobingizni yozing..." className="flex-1 p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} onKeyDown={e => e.key === 'Enter' && handleAnswer()} />
          <button onClick={handleAnswer} disabled={loading || !answer.trim()} className="px-4 rounded-xl bg-pink-600 text-white font-bold text-sm disabled:opacity-50">
            {loading ? "..." : <i className="fa-solid fa-paper-plane" />}
          </button>
        </div>
      </>)}
      {result?.completed && <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 text-center"><i className="fa-solid fa-trophy text-2xl text-pink-500 mb-2" /><p className="text-sm font-bold text-pink-700">Intervyu yakunlandi!</p>{result.score && <p className="text-xs text-pink-600 mt-1">Ball: {result.score}/100</p>}</div>}
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
    </div>
  );
};

// ==================== 9. Translator ====================
const TranslatorView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [text, setText] = useState("");
  const [target, setTarget] = useState("uz");
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.translate({ text, target_language: target, clean_dialect: true }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-language mr-2 text-teal-500" />AI Tarjimon</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tarjima + viloyat shevalarini standart tilga o'giradi</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Matnni kiriting..." rows={3} className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <select value={target} onChange={e => setTarget(e.target.value)} className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
        <option value="uz">O'zbekcha</option><option value="ru">Ruscha</option><option value="en">Inglizcha</option>
      </select>
      <button onClick={handleSubmit} disabled={loading || !text.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-teal-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tarjima qilinmoqda..." : "Tarjima qilish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{result.translated_text}</p>
          {result.dialect_corrections?.length > 0 && (<div><p className="text-[10px] font-bold mt-2" style={{ color: 'var(--text-muted)' }}>Sheva tuzatishlari:</p>
            {result.dialect_corrections.map((c: any, i: number) => <p key={i} className="text-xs"><span className="line-through text-red-400">{c.original}</span> → <span className="text-green-600 font-semibold">{c.corrected}</span></p>)}</div>)}
        </div>
      )}
    </div>
  );
};



// ==================== 10. Gig Match ====================
const GigMatchView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [desc, setDesc] = useState("");
  const [regionId, setRegionId] = useState("");
  const handleSubmit = async () => {
    if (!desc.trim() || !regionId) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.findGigWorkers({ work_description: desc, region_id: parseInt(regionId), urgency: "normal" }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-bolt mr-2 text-orange-500" />AI Tezkor Ishlar</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kunlik/tezkor ish uchun eng yaqin ishchilarni topadi</p>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Qanday ish? Masalan: To'yga 3 ta ofitsiant kerak" rows={2} className="w-full p-3 rounded-xl border text-sm resize-none" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <input type="number" value={regionId} onChange={e => setRegionId(e.target.value)} placeholder="Hudud ID raqami" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !desc.trim() || !regionId} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-orange-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Qidirilmoqda..." : "Ishchi topish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{result.ai_summary}</p>
          {result.matched_workers?.map((w: any) => (
            <div key={w.daily_job_seeker_id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex justify-between"><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{w.full_name}</p>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-700">{w.match_score}%</span></div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.works.join(", ")} • {w.region}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 11. Company Trust ====================
const CompanyTrustView: React.FC<ViewProps> = ({ loading, setLoading, result, setResult, error, setError }) => {
  const [companyName, setCompanyName] = useState("");
  const handleSubmit = async () => {
    if (!companyName.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { const r = await aiService.getCompanyTrust({ company_name: companyName }); setResult(r); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  const trustColors: Record<string, string> = { excellent: '#16a34a', good: '#22c55e', average: '#f59e0b', poor: '#f97316', dangerous: '#dc2626' };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-building-shield mr-2 text-violet-500" />Kompaniya Ishonchliligi</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ish beruvchi haqida ishchilar baholari va reyting</p>
      <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Kompaniya nomi" className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
      <button onClick={handleSubmit} disabled={loading || !companyName.trim()} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-violet-600 disabled:opacity-50 active:scale-[0.97] transition-all">
        {loading ? "Tekshirilmoqda..." : "Reytingni ko'rish"}
      </button>
      {loading && <LoadingSpinner />}
      {error && <ErrorBox msg={error} />}
      {result && (
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex justify-between items-center"><h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.company_name}</h4>
            <span className="text-lg font-black" style={{ color: trustColors[result.trust_level] || '#6b7280' }}>{result.overall_score.toFixed(1)}/5</span></div>
          <div className="grid grid-cols-3 gap-2">{[{label: "Maosh", val: result.salary_punctuality}, {label: "Sharoit", val: result.working_conditions}, {label: "Muloqot", val: result.communication}].map((m, i) => (
            <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{m.val.toFixed(1)}</p><p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p></div>
          ))}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result.ai_summary}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{result.total_reviews} ta baho • {result.total_vacancies} ta vakansiya</p>
        </div>
      )}
    </div>
  );
};



// ==================== 12. HH Vacancies ====================
const HHVacanciesView: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HHVacancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const r = await headhunterService.searchVacancies({ query: query || undefined, per_page: 20 });
      setResults(r.items);
      setTotal(r.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
        <i className="fa-solid fa-globe mr-2" style={{ color: '#d6336c' }} />HeadHunter Vakansiyalar
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>hh.uz dan qo'shimcha ish o'rinlari</p>
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kasb yoki kalit so'z..." className="flex-1 p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch} disabled={loading} className="px-4 rounded-xl text-white font-bold text-sm disabled:opacity-50 active:scale-[0.97] transition-all" style={{ backgroundColor: '#d6336c' }}>
          {loading ? "..." : <i className="fa-solid fa-search" />}
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {total > 0 && <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Topildi: {total} ta vakansiya (hh.uz)</p>}
      <div className="space-y-2">
        {results.map((v) => (
          <a key={v.hh_id} href={v.url} target="_blank" rel="noopener noreferrer"
            className="block p-3 rounded-xl border-2 transition-all active:scale-[0.98]"
            style={{ borderColor: '#d6336c40', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{v.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.company_name}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: '#d6336c15', color: '#d6336c' }}>hh.uz</span>
            </div>
            {(v.salary_from || v.salary_till) && (
              <p className="text-xs font-semibold mt-1" style={{ color: '#d6336c' }}>
                {v.salary_from?.toLocaleString()}{v.salary_from && v.salary_till && ' - '}{v.salary_till?.toLocaleString()} {v.salary_currency}
              </p>
            )}
            {v.region && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-location-dot mr-1" />{v.region}</p>}
            {v.description_short && <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{v.description_short}</p>}
          </a>
        ))}
      </div>
      {results.length === 0 && !loading && total === 0 && (
        <div className="text-center py-8">
          <i className="fa-solid fa-globe text-3xl mb-2" style={{ color: '#d6336c40' }} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Qidiruvni boshlang — hh.uz dan vakansiyalar ko'rsatiladi</p>
        </div>
      )}
    </div>
  );
};
