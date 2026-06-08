import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";

interface ContactsFormSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  ringColor: string;
  fieldErrors: Record<string, boolean>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactsFormSection: React.FC<ContactsFormSectionProps> = ({
  formData,
  setFormData,
  ringColor,
  fieldErrors,
}) => {
  const { t } = useTranslation();
  const [emailError, setEmailError] = useState(false);

  const inputClass = (field: string) => {
    const hasError = fieldErrors[field];
    return `w-full p-4 bg-white border ${hasError ? "border-red-400" : "border-slate-100"} rounded-2xl text-sm font-bold outline-none ${ringColor}`;
  };

  const handleEmailChange = (value: string) => {
    setEmailError(value !== "" && !EMAIL_RE.test(value));
    setFormData({ ...formData, email: value === "" ? null : value });
  };

  return (
    <FormSection>
      <p className="text-[10px] font-black uppercase tracking-widest ml-1">
        {t("client_forms.contacts")}
      </p>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {t("client_forms.phone")}
            </p>
            <FieldError fieldName="phone" fieldErrors={fieldErrors} />
          </div>
          <input
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={inputClass("phone")}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {t("client_forms.telegram")}
            </p>
            <FieldError fieldName="telegram" fieldErrors={fieldErrors} />
          </div>
          <input
            required
            value={formData.telegram}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
            className={inputClass("telegram")}
            placeholder="@username"
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {t("client_forms.email")}
            </p>
            {emailError && (
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                {t("client_forms.invalid_email")}
              </p>
            )}
          </div>
          <input
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={`w-full p-4 bg-white border ${emailError ? "border-red-400" : "border-slate-100"} rounded-2xl text-sm font-bold outline-none ${ringColor}`}
            placeholder={t("common.optional")}
          />
        </div>
      </div>
    </FormSection>
  );
};

export default ContactsFormSection;
