import React, { useState, useEffect } from 'react';
import { UserRole } from '../types.ts';
import { authService } from '../services/auth.ts';
import { useTranslation } from 'react-i18next';

const Onboarding: React.FC<{ onComplete: (role: UserRole) => void; onAdmin: () => void }> = ({ onComplete, onAdmin }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'splash' | 'role'>('splash');
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);

  // Auto-advance splash after 2.5 seconds
  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => setStep('role'), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleStart = () => {
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
    }, 600);
  };

  // Splash Screen (1-QADAM)
  if (step === 'splash') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-50 opacity-50" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-indigo-50 opacity-40" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-5xl font-black tracking-tight">
              <span className="text-slate-900">ISH</span>
              <span className="text-indigo-600">KO'P</span>
            </h1>
          </div>

          {/* Tagline */}
          <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
            Bugun ish toping,<br/>
            <span className="text-indigo-600">ertaga ishlang.</span>
          </h2>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-8 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-briefcase text-indigo-500 text-xs" />
              <span className="font-semibold">10 000+</span>
              <span className="text-xs">vakansiya</span>
            </div>
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-users text-indigo-500 text-xs" />
              <span className="font-semibold">8 000+</span>
              <span className="text-xs">ishchi</span>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="mt-12 w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 px-8 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-indigo-200"
          >
            Boshlash
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-arrow-right text-sm" />
            </div>
          </button>

          {/* Footer */}
          <p className="mt-6 text-xs text-slate-400">
            Ma'lumotlaringiz xavfsiz himoyalanadi
          </p>
        </div>
      </div>
    );
  }

  // Role Selection (2-QADAM)
  return (
    <div className={`min-h-screen bg-white flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto transition-all duration-500 ${isFinishing ? 'opacity-0 scale-95' : ''}`}>
      {/* Back button */}
      <button
        onClick={() => setStep('splash')}
        className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 z-10"
      >
        <i className="fa-solid fa-chevron-left text-sm" />
      </button>

      {isFinishing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center success-icon">
              <i className="fa-solid fa-check text-2xl text-emerald-600"></i>
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-emerald-300 success-ring" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('onboarding.preparing')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col fade-up">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Siz kimsiz?</h1>
            <p className="text-sm text-slate-500 font-medium">O'zingizga mos rolni tanlang</p>
          </div>

          {/* Role cards */}
          <div className="space-y-4 flex-1">
            {/* Ish qidiryapman */}
            <button
              onClick={() => handleRoleSelection(UserRole.JOB_SEEKER)}
              className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all hover:border-indigo-200 hover:shadow-md group card-enter card-enter-1"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-magnifying-glass text-xl text-indigo-600 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-slate-900">Ish qidiryapman</h3>
                <p className="text-xs text-slate-500 mt-0.5">Yangi ish topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-sm" />
            </button>

            {/* Ish beruvchiman */}
            <button
              onClick={() => handleRoleSelection(UserRole.CANDIDATE_HUNTER)}
              className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all hover:border-indigo-200 hover:shadow-md group card-enter card-enter-2"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-user-tie text-xl text-emerald-600 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-slate-900">Ish beruvchiman</h3>
                <p className="text-xs text-slate-500 mt-0.5">Xodim topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-sm" />
            </button>

            {/* Kunlik ishchi */}
            <button
              onClick={() => handleRoleSelection(UserRole.DAILY_JOB_SEEKER)}
              className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all hover:border-indigo-200 hover:shadow-md group card-enter card-enter-3"
            >
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <i className="fa-solid fa-bolt text-xl text-amber-500 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-slate-900">Kunlik ishchi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kunlik daromad topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-sm" />
            </button>
          </div>

          {/* Footer disclaimer */}
          <p className="text-center text-[11px] text-slate-400 mt-8">
            Davom etish orqali siz <span className="text-indigo-600 font-medium">qoidalar</span> bilan rozilik bildirasiz
          </p>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
