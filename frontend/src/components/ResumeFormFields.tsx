import React from "react";
import { useTranslation } from "react-i18next";
import { Gender } from "../types.ts";
import { SearchableSelect } from "./Shared.tsx";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";
import ToggleChips, { ChipOption } from "./ToggleChips.tsx";

interface ResumeFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  ringColor: string;
  accentColor: string;
  isDailyJobSeeker: boolean;
  fieldErrors: Record<string, boolean>;
  // Location
  regionOptions: ChipOption[];
  isRegionLoading: boolean;
  onRegionSearch: (search: string) => void;
  onRegionChange: (regionId: number) => void;
  districtOptions: ChipOption[];
  isDistrictLoading: boolean;
  // Works
  workOptions: ChipOption[];
  isWorksLoading: boolean;
  // File uploads
  portfolioInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  selectedPortfolioFile: File | null;
  selectedVideoFile: File | null;
  onPortfolioFileChange: (file: File | null) => void;
  onVideoFileChange: (file: File | null) => void;
}

const ResumeFormFields: React.FC<ResumeFormFieldsProps> = ({
  formData,
  setFormData,
  ringColor,
  accentColor,
  isDailyJobSeeker,
  fieldErrors,
  regionOptions,
  isRegionLoading,
  onRegionSearch,
  onRegionChange,
  districtOptions,
  isDistrictLoading,
  workOptions,
  isWorksLoading,
  portfolioInputRef,
  videoInputRef,
  selectedPortfolioFile,
  selectedVideoFile,
  onPortfolioFileChange,
  onVideoFileChange,
}) => {
  const { t } = useTranslation();

  const inputClass = (field: string) => {
    const hasError = fieldErrors[field];
    return `w-full p-4 bg-white border ${hasError ? "border-red-400" : "border-slate-100"} rounded-2xl text-sm font-bold outline-none ${ringColor}`;
  };

  return (
    <FormSection>
      {/* Age / Experience / Gender */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {t("client_forms.age")}
            </p>
            <FieldError fieldName="age" fieldErrors={fieldErrors} />
          </div>
          <input
            type="number"
            value={formData.age}
            onChange={(e) =>
              setFormData({ ...formData, age: parseInt(e.target.value) })
            }
            className={inputClass("age")}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.experience")}
          </p>
          <input
            type="number"
            value={formData.experience}
            onChange={(e) =>
              setFormData({ ...formData, experience: parseInt(e.target.value) })
            }
            className={`w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.gender")}
          </p>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as Gender })
            }
            className={`w-full p-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none ${ringColor}`}
          >
            {Object.values(Gender).map((g) => (
              <option key={g} value={g}>
                {t(`filters.gender.${g}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Region */}
      <SearchableSelect
        label={t("filters.region")}
        options={regionOptions}
        value={formData.region_id}
        onChange={(val) => onRegionChange(val as number)}
        onSearch={onRegionSearch}
        loading={isRegionLoading}
        error={fieldErrors["region_id"]}
        errorMessage={t("client_forms.required")}
      />

      {/* Districts — daily job seeker only, after region selected */}
      {isDailyJobSeeker && formData.region_id > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1">
            {t("client_forms.districts")}
          </p>
          <ToggleChips
            options={districtOptions}
            selectedIds={formData.district_ids || []}
            onToggle={(id) => {
              const current: number[] = formData.district_ids || [];
              setFormData({
                ...formData,
                district_ids: current.map(Number).includes(Number(id))
                  ? current.filter((x) => Number(x) !== Number(id))
                  : [...current, Number(id)],
              });
            }}
            loading={isDistrictLoading}
            accentColor="emerald-600"
            emptyMessage={t("common.no_results")}
          />
        </div>
      )}

      {/* Daily job seeker specific: additional workers + work types */}
      {isDailyJobSeeker && (
        <>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
              {t("client_forms.additional_workers")}
            </p>
            <input
              type="number"
              min="0"
              value={formData.additional_workers === 0 ? "" : formData.additional_workers}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  additional_workers: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                })
              }
              onFocus={(e) => {
                if (formData.additional_workers === 0) e.target.value = "";
              }}
              onBlur={(e) => {
                if (e.target.value === "") setFormData({ ...formData, additional_workers: 0 });
              }}
              className={`w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`}
              placeholder="0"
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">
              {t("client_forms.additional_workers_hint")}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1">
              {t("client_forms.work_types")}
            </p>
            <ToggleChips
              options={workOptions}
              selectedIds={formData.work_ids || []}
              onToggle={(id) => {
                const current: number[] = formData.work_ids || [];
                setFormData({
                  ...formData,
                  work_ids: current.map(Number).includes(Number(id))
                    ? current.filter((x) => Number(x) !== Number(id))
                    : [...current, Number(id)],
                });
              }}
              loading={isWorksLoading}
              accentColor="emerald-600"
              emptyMessage={t("common.no_results")}
            />
          </div>
        </>
      )}

      {/* Portfolio file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
          {t("client_forms.portfolio_file")}
        </p>
        <div className="flex gap-2">
          <input
            type="file"
            ref={portfolioInputRef}
            onChange={(e) => onPortfolioFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            onClick={() => portfolioInputRef.current?.click()}
            className={`flex-1 p-4 bg-white border border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-${accentColor} transition-colors`}
          >
            {selectedPortfolioFile
              ? selectedPortfolioFile.name
              : formData.portfolio
                ? t("client_forms.change_file")
                : t("client_forms.upload_portfolio")}
          </button>
          {formData.portfolio && (
            <a
              href={formData.portfolio}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center"
            >
              <i className="fa-solid fa-link" />
            </a>
          )}
        </div>
      </div>

      {/* Video file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
          {t("client_forms.video_file")}
        </p>
        <div className="flex gap-2">
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*"
            onChange={(e) => onVideoFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            onClick={() => videoInputRef.current?.click()}
            className={`flex-1 p-4 bg-white border border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-${accentColor} transition-colors`}
          >
            {selectedVideoFile
              ? selectedVideoFile.name
              : formData.video
                ? t("client_forms.change_file")
                : t("client_forms.upload_video")}
          </button>
          {formData.video && (
            <a
              href={formData.video}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center"
            >
              <i className="fa-solid fa-video" />
            </a>
          )}
        </div>
      </div>
    </FormSection>
  );
};

export default ResumeFormFields;
