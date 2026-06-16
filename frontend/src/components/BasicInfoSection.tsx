import React from "react";
import { useTranslation } from "react-i18next";
import { ItemStatus } from "../types.ts";
import { SearchableSelect } from "./Shared.tsx";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";
import { ChipOption } from "./ToggleChips.tsx";

interface BasicInfoSectionProps {
  type: "vacancy" | "resume";
  isDailyJobSeeker?: boolean;
  formData: any;
  setFormData: (data: any) => void;
  ringColor: string;
  fieldErrors: Record<string, boolean>;
  professionOptions: ChipOption[];
  isProfLoading: boolean;
  onProfessionSearch: (search: string) => void;
  regionOptions: ChipOption[];
  isRegionLoading: boolean;
  onRegionSearch: (search: string) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  type,
  isDailyJobSeeker = false,
  formData,
  setFormData,
  ringColor,
  fieldErrors,
  professionOptions,
  isProfLoading,
  onProfessionSearch,
  regionOptions,
  isRegionLoading,
  onRegionSearch,
}) => {
  const { t } = useTranslation();

  const inputClass = (field: string) => {
    const hasError = fieldErrors[field];
    return `w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${
      hasError 
        ? "border-red-400 bg-red-50 text-red-700" 
        : "border-gray-200 bg-white text-gray-900"
    } ${ringColor}`;
  };

  const handleNameChange = (field: string, value: string) => {
    // Harflar, bo'sh joy, apostrof va oʻzbek harflarini qabul qilish
    const cleanValue = value.replace(/[^a-zA-Zа-яёА-ЯЁ\u0400-\u04FF\u02BB\u02BC\s'`\u2018\u2019-]/g, '');
    setFormData({ ...formData, [field]: cleanValue });
  };

  const handleCompanyNameChange = (value: string) => {
    // Kompaniya nomi uchun raqamlar ham ruxsat etilgan
    const cleanValue = value.replace(/[^a-zA-Zа-яёА-ЯЁ\u0400-\u04FF0-9\s'`.-]/g, '');
    setFormData({ ...formData, company_name: cleanValue });
  };

  return (
    <FormSection>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {type === "vacancy"
                ? t("client_forms.company_name")
                : t("client_forms.first_name")} *
            </p>
            <FieldError
              fieldName={type === "vacancy" ? "company_name" : "first_name"}
              fieldErrors={fieldErrors}
            />
          </div>
          <input
            required
            value={type === "vacancy" ? formData.company_name || "" : formData.first_name || ""}
            onChange={(e) => {
              if (type === "vacancy") {
                handleCompanyNameChange(e.target.value);
              } else {
                handleNameChange("first_name", e.target.value);
              }
            }}
            className={inputClass(type === "vacancy" ? "company_name" : "first_name")}
            placeholder={type === "vacancy" ? "MasCompany LLC" : "Islom"}
            maxLength={50}
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            {type === "vacancy" ? t("form_hints.company_name_hint") : t("form_hints.name_letters_only")}
          </p>
        </div>

        {type === "resume" && (
          <div>
            <div className="flex items-center gap-2 mb-2 ml-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                {t("client_forms.last_name")} *
              </p>
              <FieldError fieldName="last_name" fieldErrors={fieldErrors} />
            </div>
            <input
              required
              value={formData.last_name || ""}
              onChange={(e) => handleNameChange("last_name", e.target.value)}
              className={inputClass("last_name")}
              placeholder="Karimov"
              maxLength={50}
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">
              {t("form_hints.lastname_letters_only")}
            </p>
          </div>
        )}

        {type === "resume" && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                {t("client_forms.middle_name")}
              </p>
            </div>
            <input
              value={formData.middle_name || ""}
              onChange={(e) => handleNameChange("middle_name", e.target.value)}
              className={`w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`}
              placeholder={t("form_hints.middlename_placeholder")}
              maxLength={50}
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">
              {t("form_hints.middlename_optional")}
            </p>
          </div>
        )}

        {type === "vacancy" && (
          <div>
            <div className="flex items-center gap-2 mb-2 ml-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                {t("filters.region")} *
              </p>
              <FieldError fieldName="region_id" fieldErrors={fieldErrors} />
            </div>
            <SearchableSelect
              label=""
              options={regionOptions}
              value={formData.region_id}
              onChange={(val) => setFormData({ ...formData, region_id: val })}
              onSearch={onRegionSearch}
              loading={isRegionLoading}
              error={fieldErrors["region_id"]}
              errorMessage={t("client_forms.required")}
              placeholder={t("client_forms.select_region")}
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">
              {t("form_hints.region_hint")}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDailyJobSeeker && (
          <div>
            <div className="flex items-center gap-2 mb-2 ml-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                {t("filters.profession")} *
              </p>
              <FieldError fieldName="profession_id" fieldErrors={fieldErrors} />
            </div>
            <SearchableSelect
              label=""
              options={professionOptions}
              value={formData.profession_id}
              onChange={(val) => setFormData({ ...formData, profession_id: val })}
              onSearch={onProfessionSearch}
              loading={isProfLoading}
              error={fieldErrors["profession_id"]}
              errorMessage={t("client_forms.required")}
              placeholder={t("client_forms.select_profession")}
            />
          </div>
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.current_status")}
          </p>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as ItemStatus })
            }
            className={`w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`}
          >
            <option value={ItemStatus.ACTIVE}>{t("client_forms.status.active")}</option>
            <option value={ItemStatus.DRAFT}>{t("client_forms.status.draft")}</option>
          </select>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            {t("form_hints.status_hint")}
          </p>
        </div>
      </div>
    </FormSection>
  );
};

export default BasicInfoSection;
