import React, { useState } from 'react';
import { UserRole } from '../types.ts';
import { authService } from '../services/auth.ts';
import { useTranslation } from 'react-i18next';

const Onboarding: React.FC<{ onComplete: (role: UserRole) => void; onAdmin: () => void }> = ({ onComplete, onAdmin }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'lang' | 'role'>('lang');
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);

  const handleLanguageSelection = async (langCode: string) => {
    setIsSavingLang(true);
    // Change i18n language locally first
    i18n.changeLanguage(langCode);

    // Persist language to backend
    const success = await authService.updateLanguage(langCode);
    if (!success) {
      console.warn('Failed to save language to backend, continuing anyway');
    }

    setIsSavingLang(false);
    setStep('role');
  };

  const handleRoleSelection = async (role: UserRole) => {
    setIsFinishing(true);
    const success = await authService.updateRole(role);
    if (!success) {
      setIsFinishing(false);
      alert(t('onboarding.failed_role'));
      return;
    }
    setTimeout(() => {
      onComplete(role);
    }, 800);
  };

  return (
    <div className={`min-h-screen bg-onboarding p-4 flex flex-col items-center justify-center text-center max-w-md mx-auto transition-all duration-1000 relative overflow-hidden ${isFinishing ? 'opacity-0 scale-95 blur-sm' : ''}`}>
      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="floating-1 absolute top-[15%] left-[10%] w-16 h-16 rounded-full bg-blue-100/30 blur-lg" />
        <div className="floating-2 absolute top-[25%] right-[8%] w-12 h-12 rounded-full bg-violet-100/30 blur-lg" />
        <div className="floating-1 absolute bottom-[20%] left-[15%] w-10 h-10 rounded-full bg-emerald-100/30 blur-lg" />
        <div className="floating-2 absolute bottom-[30%] right-[12%] w-14 h-14 rounded-full bg-blue-100/20 blur-lg" />
      </div>

      {isFinishing ? (
        <div className="flex flex-col items-center gap-4 relative z-10">
          {/* Success animation */}
          <div className="relative">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center success-icon">
              <i className="fa-solid fa-check text-2xl text-emerald-600"></i>
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-emerald-300 success-ring" />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('onboarding.preparing')}</p>
        </div>
      ) : step === 'lang' ? (
        <div className="relative z-10 w-full fade-up">
          <div className="mb-8 animate-bounce-short">
            <img style={{ width: '120px' }} src='./logo_new.png' alt="Ish Ko'p" className="mx-auto" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t('onboarding.title')}</h1>
          <p className="text-sm text-slate-500 mb-10 font-medium">{t('onboarding.ecosystem')}</p>
          <div className="w-full space-y-3">
            {[
              { label: 'O\'zbekcha', code: 'uz', flag: '🇺🇿' },
              { label: 'Русский', code: 'ru', flag: '🇷🇺' },
              { label: 'English', code: 'en', flag: '🇺🇸' },
            ].map((l, i) => (
              <button
                key={l.code}
                onClick={() => handleLanguageSelection(l.code)}
                disabled={isSavingLang}
                className={`w-full py-4 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl font-semibold text-slate-700 text-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-[0.97] card-shadow flex items-center justify-center gap-3 card-enter card-enter-${i + 1} ${isSavingLang ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">{l.flag}</span>
                {isSavingLang ? <i className="fa-solid fa-spinner animate-spin"></i> : l.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full fade-up">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{t('onboarding.your_profile')}</h2>
          <p className="text-sm text-slate-500 mb-8 font-medium">{t('onboarding.select_objective')}</p>
          <div className="w-full space-y-3">
            <button onClick={() => handleRoleSelection(UserRole.CANDIDATE_HUNTER)} className="w-full p-5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl card-shadow hover:border-violet-200 hover:shadow-md transition-all flex items-center gap-4 group text-left active:scale-[0.97] card-enter card-enter-1">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-500 text-xl shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors group-hover:shadow-lg group-hover:shadow-violet-200"><i className="fa-solid fa-user-tie"></i></div>
              <div><h3 className="font-extrabold text-base text-slate-800">{t('onboarding.partner')}</h3><p className="text-[11px] font-medium text-slate-400 mt-0.5">{t('onboarding.partner_desc')}</p></div>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-200 ml-auto" />
            </button>
            <button onClick={() => handleRoleSelection(UserRole.JOB_SEEKER)} className="w-full p-5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl card-shadow hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-4 group text-left active:scale-[0.97] card-enter card-enter-2">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 text-xl shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors group-hover:shadow-lg group-hover:shadow-blue-200"><i className="fa-solid fa-user-graduate"></i></div>
              <div><h3 className="font-extrabold text-base text-slate-800">{t('onboarding.candidate')}</h3><p className="text-[11px] font-medium text-slate-400 mt-0.5">{t('onboarding.candidate_desc')}</p></div>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-200 ml-auto" />
            </button>
            <button onClick={() => handleRoleSelection(UserRole.DAILY_JOB_SEEKER)} className="w-full p-5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl card-shadow hover:border-emerald-200 hover:shadow-md transition-all flex items-center gap-4 group text-left active:scale-[0.97] card-enter card-enter-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 text-xl shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors group-hover:shadow-lg group-hover:shadow-emerald-200"><i className="fa-solid fa-calendar-day"></i></div>
              <div><h3 className="font-extrabold text-base text-slate-800">{t('onboarding.daily_job_seeker')}</h3><p className="text-[11px] font-medium text-slate-400 mt-0.5">{t('onboarding.daily_job_seeker_desc')}</p></div>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-200 ml-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
