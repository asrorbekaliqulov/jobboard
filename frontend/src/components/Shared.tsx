import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export const SearchableSelect: React.FC<{
  label?: string;
  options: { id?: string | number; name?: string; value?: string | number; label?: string }[];
  value: string | number;
  onChange: (val: any) => void;
  onSearch?: (search: string) => void;
  loading?: boolean;
  placeholder?: string;
  accentColor?: string;
  variant?: 'default' | 'admin';
  error?: boolean;
  errorMessage?: string;
}> = ({ label, options, value, onChange, onSearch, loading, placeholder, accentColor = "blue-500", variant = 'default', error = false, errorMessage }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cachedSelected, setCachedSelected] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => {
      onSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  const getOptionLabel = (o: any) => o.label || o.name || '';
  const getOptionValue = (o: any) => (o.value !== undefined ? o.value : o.id) || '';

  const filtered = useMemo(() => {
    if (onSearch) return options; // When using backend search, we trust the options provided
    return options.filter(o => getOptionLabel(o).toLowerCase().includes(search.toLowerCase()));
  }, [options, search, onSearch]);

  const selected = options.find(o => getOptionValue(o).toString() === value?.toString());

  useEffect(() => {
    if (selected) {
      setCachedSelected(selected);
    }
  }, [selected]);

  const displaySelected = selected || (cachedSelected && getOptionValue(cachedSelected).toString() === value?.toString() ? cachedSelected : null);

  const errorBorder = error ? 'border-red-300' : 'border-slate-100';
  const buttonClasses = variant === 'admin'
    ? `w-full bg-white border ${error ? 'border-red-300' : 'border-slate-200'} rounded-xl p-3.5 text-sm font-semibold flex justify-between items-center outline-none focus:ring-2 focus:ring-blue-400 transition-all`
    : `w-full p-3.5 bg-slate-50 border ${errorBorder} rounded-xl text-sm font-semibold flex justify-between items-center transition-all ${isOpen ? 'ring-2 ring-blue-400 bg-white border-blue-200' : ''}`;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center gap-2 mb-1.5 ml-0.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
          {error && errorMessage && <span className="text-[10px] font-medium text-red-500">{errorMessage}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <span className={displaySelected ? 'text-slate-800' : 'text-slate-400'}>{displaySelected ? getOptionLabel(displaySelected) : t('common.select_option')}</span>
        <div className="flex items-center gap-2">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-1 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-[11px]"></i>
            </span>
          )}
          <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] overflow-hidden fade-up">
          <div className="p-2.5 border-b border-slate-50">
            <div className="relative">
              <input
                autoFocus
                className="w-full p-2.5 pl-9 bg-slate-50 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-1 focus:ring-blue-200 transition-all"
                placeholder={placeholder || t('common.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <i className="fa-solid fa-circle-xmark text-[12px]"></i>
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i>
                {t('common.searching')}
              </div>
            ) : filtered.length > 0 ? filtered.map(opt => (
              <button
                key={getOptionValue(opt)}
                onClick={() => { onChange(getOptionValue(opt)); setIsOpen(false); setSearch(''); }}
                className={`w-full p-3.5 text-left text-xs font-medium hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                  getOptionValue(opt).toString() === value?.toString() ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'
                }`}
              >
                {getOptionLabel(opt)}
              </button>
            )) : (
              <div className="p-4 text-center text-xs font-medium text-slate-400">{t('common.no_results')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Pagination: React.FC<{
  current: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
  variant?: 'light' | 'dark';
}> = ({ current, total, perPage, onChange, variant = 'light' }) => {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const activeBg = variant === 'light' ? 'bg-blue-500' : 'bg-slate-800';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        const container = scrollRef.current;
        const scrollLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [current]);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 py-3">
      <button disabled={current === 1} onClick={() => onChange(current - 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-25 active:scale-90 transition-all flex items-center justify-center">
        <i className="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
      <div ref={scrollRef} className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide px-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            data-active={current === p}
            className={`flex-shrink-0 w-9 h-9 rounded-xl text-xs font-bold transition-all ${current === p ? `${activeBg} text-white shadow-md` : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        ))}
      </div>
      <button disabled={current === totalPages} onClick={() => onChange(current + 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-25 active:scale-90 transition-all flex items-center justify-center">
        <i className="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center px-6 py-6 fade-up">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center text-2xl mb-5 mx-auto">
          <i className="fa-solid fa-trash-can"></i>
        </div>
        <h3 className="text-lg font-extrabold text-center text-slate-900 mb-6">{title}</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-wide active:scale-95 transition-all">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-wide shadow-lg shadow-red-100 active:scale-95 transition-all">
            {t('common.confirm_delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
