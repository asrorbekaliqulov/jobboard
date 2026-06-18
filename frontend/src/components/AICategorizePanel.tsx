/**
 * AI Auto-Categorize Panel for Admin
 * Allows admin to AI-categorize professions with preview, apply, revert.
 */
import React, { useState } from "react";
import { mainApi } from "../services/api.ts";

const getHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

interface Group {
  parent_name_uz: string;
  parent_name_ru: string;
  parent_name_en: string;
  parent_existing_id: number | null;
  children: { id: number; name_uz: string; name_ru: string; current_parent_id: number | null }[];
  children_count: number;
}

interface AICategorizeResult {
  groups: Group[];
  total_professions: number;
  total_groups: number;
  error: string | null;
}

interface Props {
  onRefresh: () => void;
}

const AICategorizePanel: React.FC<Props> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AICategorizeResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    setApplied(false);
    setApplyResult(null);
    try {
      const res = await fetch(`${mainApi}/api/v1/admin/professions/ai-categorize/preview`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("AI xizmatida xatolik");
      const data: AICategorizeResult = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${mainApi}/api/v1/admin/professions/ai-categorize/apply`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(preview.groups),
      });
      if (!res.ok) throw new Error("Qo'llashda xatolik");
      const data = await res.json();
      if (data.success) {
        setApplied(true);
        setApplyResult(`${data.changes_made} ta kasb yangilandi, ${data.parents_created} ta yangi parent yaratildi`);
        onRefresh();
      } else {
        throw new Error(data.error || "Xatolik");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!confirm("Haqiqatdan barcha kategoriyalarni bekor qilmoqchimisiz?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${mainApi}/api/v1/admin/professions/ai-categorize/revert`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Bekor qilishda xatolik");
      const data = await res.json();
      if (data.success) {
        setPreview(null);
        setApplied(false);
        setApplyResult("Barcha kategoriyalar bekor qilindi");
        onRefresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-robot text-indigo-500" />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Avtomatik Saralash</span>
        </div>
        <div className="flex gap-2">
          {!preview && !applied && (
            <button onClick={handlePreview} disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 disabled:opacity-50 active:scale-95 transition-all">
              {loading ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Tahlil qilinmoqda...</> : <><i className="fa-solid fa-wand-magic-sparkles mr-1" /> Avtomatik saralash</>}
            </button>
          )}
          {preview && !applied && (
            <>
              <button onClick={handleApply} disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 disabled:opacity-50 active:scale-95 transition-all">
                <i className="fa-solid fa-check mr-1" /> Tasdiqlash
              </button>
              <button onClick={handlePreview} disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-50 active:scale-95 transition-all"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-rotate mr-1" /> Qayta saralash
              </button>
              <button onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 active:scale-95 transition-all">
                <i className="fa-solid fa-xmark mr-1" /> Bekor qilish
              </button>
            </>
          )}
          {applied && (
            <button onClick={handleRevert} disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 active:scale-95 transition-all">
              <i className="fa-solid fa-rotate-left mr-1" /> Orqaga qaytarish
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-3">
          <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
        </div>
      )}

      {/* Apply result */}
      {applyResult && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs mb-3">
          <i className="fa-solid fa-check-circle mr-1" /> {applyResult}
        </div>
      )}

      {/* Preview */}
      {preview && !applied && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span><b>{preview.total_professions}</b> ta kasb</span>
            <span><b>{preview.total_groups}</b> ta guruh</span>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {preview.groups.map((group, i) => (
              <div key={i} className="rounded-xl border p-3" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {group.parent_name_uz}
                    {group.parent_existing_id && <span className="text-[9px] ml-1 text-green-600">(mavjud)</span>}
                    {!group.parent_existing_id && <span className="text-[9px] ml-1 text-amber-600">(yangi yaratiladi)</span>}
                  </span>
                  <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{group.children_count} ta</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.children.map(child => (
                    <span key={child.id} className="px-2 py-0.5 rounded text-[9px] font-medium bg-slate-100" style={{ color: 'var(--text-secondary)' }}>
                      {child.name_uz}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICategorizePanel;
