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
    return `w-full p-4 bg-white border ${hasError ? "border-red-400" : "border-slate-100"} rounded-2xl text-sm font-bold outline-none ${ringColor}`;
  };

  return (
    <FormSection>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {type === "vacancy"
                ? t("client_forms.company_name")
                : t("client_forms.first_name")}
            </p>
            <FieldError
              fieldName={type === "vacancy" ? "company_name" : "first_name"}
              fieldErrors={fieldErrors}
            />
          </div>
          <input
            required
            value={type === "vacancy" ? formData.company_name : formData.first_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                [type === "vacancy" ? "company_name" : "first_name"]: e.target.value,
              })
            }
            className={inputClass(type === "vacancy" ? "company_name" : "first_name")}
          />
        </div>

        {type === "resume" && (
          <div>
            <div className="flex items-center gap-2 mb-1.5 ml-1">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {t("client_forms.last_name")}
              </p>
              <FieldError fieldName="last_name" fieldErrors={fieldErrors} />
            </div>
            <input
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={inputClass("last_name")}
            />
          </div>
        )}

        {type === "vacancy" && (
          <SearchableSelect
            label={t("filters.region")}
            options={regionOptions}
            value={formData.region_id}
            onChange={(val) => setFormData({ ...formData, region_id: val })}
            onSearch={onRegionSearch}
            loading={isRegionLoading}
            error={fieldErrors["region_id"]}
            errorMessage={t("client_forms.required")}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDailyJobSeeker && (
          <SearchableSelect
            label={t("filters.profession")}
            options={professionOptions}
            value={formData.profession_id}
            onChange={(val) => setFormData({ ...formData, profession_id: val })}
            onSearch={onProfessionSearch}
            loading={isProfLoading}
            error={fieldErrors["profession_id"]}
            errorMessage={t("client_forms.required")}
          />
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.current_status")}
          </p>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as ItemStatus })
            }
            className={`w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`}
          >
            <option value={ItemStatus.ACTIVE}>{t("client_forms.status.active")}</option>
            <option value={ItemStatus.DRAFT}>{t("client_forms.status.draft")}</option>
            <option value={ItemStatus.DELETED}>{t("client_forms.status.deleted")}</option>
          </select>
        </div>
      </div>
    </FormSection>
  );
};

export default BasicInfoSection;
