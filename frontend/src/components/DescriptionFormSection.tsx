import React from "react";
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

  const accentColor = type === "vacancy" ? "purple" : isDailyJobSeeker ? "emerald" : "blue";

  return (
    <FormSection>
      <div className="flex items-center gap-2 mb-1.5 ml-1">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
          {t("client_forms.description")}
        </p>
        <FieldError fieldName="description" fieldErrors={fieldErrors} />
      </div>
      <RichTextEditor
        value={formData.description}
        onChange={(val) => setFormData({ ...formData, description: val })}
        placeholder={t("client_forms.desc_placeholder")}
        maxLength={type === "vacancy" ? 2000 : 1200}
        accentColor={accentColor}
      />
    </FormSection>
  );
};

export default DescriptionFormSection;
