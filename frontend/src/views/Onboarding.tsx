import React, { useState, useEffect } from 'react';
import { UserRole } from '../types.ts';
import { authService } from '../services/auth.ts';
import { useTranslation } from 'react-i18next';

const Onboarding: React.FC<{ onComplete: (role: UserRole) => void; onAdmin: () => void }> = ({ onComplete, onAdmin }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'splash' | 'role'>('splash');
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => setStep('role'), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleStart = () => setStep('role');

  const handleRoleSelection = async (role: UserRole) => {
    setIsFinishing(true);
    if (authService.isAuthenticated()) {
      try {
        await authService.updateRole(role);
      } catch (e) {
        console.warn('Could not save role to server, continuing locally:', e);
      }
    }
    setTimeout(() => { onComplete(role); }, 600);
  };

  // ─── Splash Screen ────────────────────────────────────────────────────
  if (step === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30" style={{ background: 'var(--accent-lighter)' }} />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-20" style={{ background: 'var(--accent-lighter)' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-black tracking-tight">
              <span style={{ color: 'var(--text-primary)' }}>ISH</span>
              <span style={{ color: 'var(--accent)' }}>KO'P</span>
            </h1>
          </div>
          <h2 className="text-2xl font-bold leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            Bugun ish toping,<br/>
            <span style={{ color: 'var(--accent)' }}>ertaga ishlang.</span>
          </h2>
          <div className="flex items-center gap-6 mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-briefcase text-xs" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold">10 000+</span>
              <span className="text-xs">vakansiya</span>
            </div>
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-users text-xs" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold">8 000+</span>
              <span className="text-xs">ishchi</span>
            </div>
          </div>
          <button onClick={handleStart} className="mt-12 w-full max-w-xs text-white font-bold text-base py-4 px-8 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg" style={{ background: 'var(--accent)' }}>
            Boshlash
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-arrow-right text-sm" />
            </div>
          </button>
          <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            Ma'lumotlaringiz xavfsiz himoyalanadi
          </p>
        </div>
      </div>
    );
  }

  // ─── Role Selection ───────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto transition-all duration-500 ${isFinishing ? 'opacity-0 scale-95' : ''}`} style={{ background: 'var(--bg-primary)' }}>
      <button onClick={() => setStep('splash')} className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full z-10" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
        <i className="fa-solid fa-chevron-left text-sm" />
      </button>

      {isFinishing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center success-icon">
              <i className="fa-solid fa-check text-2xl text-emerald-600"></i>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('onboarding.preparing')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col fade-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Siz kimsiz?</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>O'zingizga mos rolni tanlang</p>
          </div>

          <div className="space-y-4 flex-1">
            <button onClick={() => handleRoleSelection(UserRole.JOB_SEEKER)} className="w-full p-5 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all border-2 card-enter card-enter-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-lighter)' }}>
                <i className="fa-solid fa-magnifying-glass text-xl" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Ish qidiryapman</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Yangi ish topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-sm" style={{ color: 'var(--text-muted)' }} />
            </button>

            <button onClick={() => handleRoleSelection(UserRole.CANDIDATE_HUNTER)} className="w-full p-5 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all border-2 card-enter card-enter-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/30">
                <i className="fa-solid fa-user-tie text-xl text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Ish beruvchiman</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Xodim topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-sm" style={{ color: 'var(--text-muted)' }} />
            </button>

            <button onClick={() => handleRoleSelection(UserRole.DAILY_JOB_SEEKER)} className="w-full p-5 rounded-2xl flex items-center gap-4 text-left active:scale-[0.97] transition-all border-2 card-enter card-enter-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-900/30">
                <i className="fa-solid fa-bolt text-xl text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Kunlik ishchi</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Kunlik daromad topish</p>
              </div>
              <i className="fa-solid fa-chevron-right text-sm" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          <p className="text-center text-[11px] mt-8" style={{ color: 'var(--text-muted)' }}>
            Davom etish orqali siz <span style={{ color: 'var(--accent)' }} className="font-medium">qoidalar</span> bilan rozilik bildirasiz
          </p>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
