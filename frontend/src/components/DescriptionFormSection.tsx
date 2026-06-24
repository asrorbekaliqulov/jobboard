import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";
import RichTextEditor from "./RichTextEditor.tsx";
import { aiService } from "../services/aiService.ts";

interface DescriptionFormSectionProps {
  type: "vacancy" | "resume";
  isDailyJobSeeker: boolean;
  formData: any;
  setFormData: (data: any) => void;
  fieldErrors: Record<string, boolean>;
}

// Count words from text that may contain HTML markup
const countWords = (value: string): number => {
  if (!value) return 0;
  const plain = value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  return plain.trim().split(/\s+/).filter((w) => w.length > 0).length;
};

const DescriptionFormSection: React.FC<DescriptionFormSectionProps> = ({
  type,
  isDailyJobSeeker,
  formData,
  setFormData,
  fieldErrors,
}) => {
  const { t } = useTranslation();
  const [wordCount, setWordCount] = useState(() => countWords(formData.description || ""));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const accentColor = type === "vacancy" ? "purple" : isDailyJobSeeker ? "emerald" : "blue";
  const maxLength = type === "vacancy" ? 2000 : 1200;
  const minLength = 20;

  const handleDescriptionChange = (value: string) => {
    setWordCount(countWords(value));
    setFormData({ ...formData, description: value });
  };

  // AI beautify: takes user's rough text and rewrites it professionally
  const handleAIPolish = async () => {
    const raw = (formData.description || "").replace(/<[^>]*>/g, " ").trim();
    if (countWords(raw) < 2) return;
    setAiLoading(true);
    setAiError(null);
    try {
      if (type === "vacancy") {
        const r = await aiService.writeJobPost({ simple_text: raw });
        setFormData({ ...formData, description: r.description });
        setWordCount(countWords(r.description));
      } else {
        const r = await aiService.buildResume({ simple_text: raw });
        const txt = r.formatted_resume_text || r.professional_summary || raw;
        setFormData({ ...formData, description: txt });
        setWordCount(countWords(txt));
      }
    } catch (e: any) {
      setAiError(e.message || "AI xatolik");
      setTimeout(() => setAiError(null), 3000);
    } finally {
      setAiLoading(false);
    }
  };

  const getPlaceholderText = () => {
    if (type === "vacancy") {
      return `Ish haqida batafsil ma'lumot:
• Asosiy vazifalar va mas'uliyat
• Talab qilinadigan ko'nikmalar
• Ish sharoitlari va imtiyozlar
• Ish vaqti va maosh haqida ma'lumot`;
    } else if (isDailyJobSeeker) {
      return `O'zingiz haqida yozing:
• Qanday ishlarda tajribangiz bor
• Qaysi hududlarda ishlashingiz mumkin
• Qo'shimcha ma'lumotlar`;
    } else {
      return `Professional tajribangiz haqida:
• Asosiy ko'nikmalar va bilimlar
• Oldingi ish tajribasi
• Yutuqlar va loyihalar
• Karyera maqsadlari`;
    }
  };

  // Show AI polish button once user wrote at least ~10 words
  const showAIButton = wordCount >= 10;

  return (
    <FormSection>
      <div className="flex items-center justify-between mb-3 ml-1">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
            {t("client_forms.description")} *
          </p>
          <FieldError fieldName="description" fieldErrors={fieldErrors} />
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-400">
          <span>{wordCount} {t("form_hints.desc_words")}</span>
          <span>•</span>
          <span className={wordCount < minLength ? "text-red-400" : wordCount > 250 ? "text-amber-500" : "text-green-500"}>
            {wordCount >= minLength && wordCount <= 250
              ? t("form_hints.desc_good")
              : wordCount < minLength
                ? t("form_hints.desc_short")
                : t("form_hints.desc_long")}
          </span>
        </div>
      </div>

      <div className="relative">
        <RichTextEditor
          value={formData.description || ""}
          onChange={handleDescriptionChange}
          placeholder={getPlaceholderText()}
          maxLength={maxLength}
          accentColor={accentColor}
        />
        {showAIButton && (
          <button
            type="button"
            onClick={handleAIPolish}
            disabled={aiLoading}
            title="AI bilan chiroyli yozish"
            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
          >
            {aiLoading ? (
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="fa-solid fa-wand-magic-sparkles" />
            )}
            AI
          </button>
        )}
      </div>

      {aiError && <p className="text-[10px] text-red-500 mt-2 ml-1">{aiError}</p>}

      <div className="flex items-center justify-between text-[9px] text-gray-400 mt-2 ml-1">
        <span>
          {wordCount < minLength
            ? t("form_hints.desc_add_words", { count: minLength - wordCount })
            : t("form_hints.desc_chars_left", { count: Math.max(0, maxLength - (formData.description?.length || 0)) })}
        </span>
        <span>
          {(formData.description?.length || 0)} / {maxLength} {t("form_hints.desc_chars_count")}
        </span>
      </div>

      {showAIButton && !aiLoading && (
        <p className="text-[10px] mt-2 ml-1" style={{ color: "#6366f1" }}>
          <i className="fa-solid fa-wand-magic-sparkles mr-1" />
          Yozganlaringizni AI chiroyli ko'rinishga keltirib berishi mumkin — yuqoridagi "AI" tugmasini bosing.
        </p>
      )}

      {wordCount < minLength && wordCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2 text-amber-600">
            <i className="fa-solid fa-lightbulb text-sm"></i>
            <p className="text-xs font-semibold">{t("form_hints.desc_tip_title")}</p>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            {t("form_hints.desc_tip_text")}
          </p>
        </div>
      )}
    </FormSection>
  );
};

export default DescriptionFormSection;
