import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";
import RichTextEditor from "./RichTextEditor.tsx";

interface DescriptionFormSectionProps {
  type: "vacancy" | "resume";
  isDailyJobSeeker: boolean;
  formData: any;
  setFormData: (data: any) => void;
  fieldErrors: Record<string, boolean>;
}

const DescriptionFormSection: React.FC<DescriptionFormSectionProps> = ({
  type,
  isDailyJobSeeker,
  formData,
  setFormData,
  fieldErrors,
}) => {
  const { t } = useTranslation();
  const [wordCount, setWordCount] = useState(0);

  const accentColor = type === "vacancy" ? "purple" : isDailyJobSeeker ? "emerald" : "blue";
  const maxLength = type === "vacancy" ? 2000 : 1200;
  const minLength = 50;

  const handleDescriptionChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setFormData({ ...formData, description: value });
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
          <span>{wordCount} so'z</span>
          <span>•</span>
          <span className={wordCount < minLength ? "text-red-400" : wordCount > 200 ? "text-amber-500" : "text-green-500"}>
            {minLength < wordCount && wordCount <= 200 ? "Yaxshi" : wordCount < minLength ? "Juda qisqa" : "Ko'p yozilgan"}
          </span>
        </div>
      </div>
      
      <RichTextEditor
        value={formData.description || ""}
        onChange={handleDescriptionChange}
        placeholder={getPlaceholderText()}
        maxLength={maxLength}
        accentColor={accentColor}
      />
      
      <div className="flex items-center justify-between text-[9px] text-gray-400 mt-2 ml-1">
        <span>
          {wordCount < minLength 
            ? `Kamida ${minLength - wordCount} so'z qo'shing` 
            : `${Math.max(0, maxLength - (formData.description?.length || 0))} belgi qoldi`
          }
        </span>
        <span>
          {(formData.description?.length || 0)} / {maxLength} belgi
        </span>
      </div>
      
      {wordCount < minLength && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2 text-amber-600">
            <i className="fa-solid fa-lightbulb text-sm"></i>
            <p className="text-xs font-semibold">Taklif:</p>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Tavsif qisqa ko'rinmoqda. Ko'proq ma'lumot qo'shish e'loningizni yanada jozibali qiladi.
          </p>
        </div>
      )}
    </FormSection>
  );
};

export default DescriptionFormSection;
