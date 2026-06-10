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
const PHONE_RE = /^\+?[0-9\s\-\(\)]+$/;

const ContactsFormSection: React.FC<ContactsFormSectionProps> = ({
  formData,
  setFormData,
  ringColor,
  fieldErrors,
}) => {
  const { t } = useTranslation();
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  const inputClass = (field: string, hasCustomError = false) => {
    const hasError = fieldErrors[field] || hasCustomError;
    return `w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${
      hasError 
        ? "border-red-400 bg-red-50 text-red-700" 
        : "border-gray-200 bg-white text-gray-900"
    } ${ringColor}`;
  };

  const handleEmailChange = (value: string) => {
    const trimmedValue = value.trim();
    setEmailError(trimmedValue !== "" && !EMAIL_RE.test(trimmedValue));
    setFormData({ ...formData, email: trimmedValue === "" ? null : trimmedValue });
  };

  const handlePhoneChange = (value: string) => {
    // Faqat raqamlar, +, bo'sh joy, tire, qavslarni qoldiramiz
    const cleanValue = value.replace(/[^+0-9\s\-\(\)]/g, '');
    setPhoneError(cleanValue !== "" && !PHONE_RE.test(cleanValue));
    setFormData({ ...formData, phone: cleanValue });
  };

  const handleTelegramChange = (value: string) => {
    // @ belgisi bilan boshlash va faqat ruxsat etilgan belgilarni qoldirish
    let cleanValue = value.replace(/[^a-zA-Z0-9_@]/g, '');
    
    // Agar @ bilan boshlanmasa, qo'shamiz
    if (cleanValue && !cleanValue.startsWith('@')) {
      cleanValue = '@' + cleanValue;
    }
    
    // Username uzunligini cheklash (Telegram 5-32 belgi)
    if (cleanValue.length > 33) {
      cleanValue = cleanValue.slice(0, 33);
    }
    
    setFormData({ ...formData, telegram: cleanValue });
  };

  return (
    <FormSection>
      <p className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-700 mb-4">
        {t("client_forms.contacts")}
      </p>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {t("client_forms.phone")} *
            </p>
            <FieldError fieldName="phone" fieldErrors={fieldErrors} />
            {phoneError && (
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                Noto'g'ri format
              </p>
            )}
          </div>
          <input
            required
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={inputClass("phone", phoneError)}
            placeholder="+998 90 123 45 67"
            maxLength={20}
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Telefon raqam (+998 90 123 45 67 formatida)
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {t("client_forms.telegram")} *
            </p>
            <FieldError fieldName="telegram" fieldErrors={fieldErrors} />
          </div>
          <div className="relative">
            <input
              required
              value={formData.telegram || ""}
              onChange={(e) => handleTelegramChange(e.target.value)}
              className={inputClass("telegram")}
              placeholder="@username"
              maxLength={33}
            />
            {formData.telegram && formData.telegram.length > 1 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <i className="fa-brands fa-telegram text-blue-500 text-lg"></i>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Telegram username (@username formatida)
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {t("client_forms.email")}
            </p>
            {emailError && (
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                {t("client_forms.invalid_email")}
              </p>
            )}
          </div>
          <div className="relative">
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={inputClass("email", emailError)}
              placeholder="example@mail.com (ixtiyoriy)"
              maxLength={100}
            />
            {formData.email && EMAIL_RE.test(formData.email) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <i className="fa-solid fa-check text-green-500"></i>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Email manzil (ixtiyoriy maydon)
          </p>
        </div>
      </div>
    </FormSection>
  );
};
};

export default ContactsFormSection;
