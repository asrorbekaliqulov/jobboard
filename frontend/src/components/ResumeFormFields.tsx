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
    return `w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${
      hasError 
        ? "border-red-400 bg-red-50 text-red-700" 
        : "border-gray-200 bg-white text-gray-900"
    } ${ringColor}`;
  };

  const handleAgeChange = (value: string) => {
    const age = parseInt(value);
    if (isNaN(age) || age < 14 || age > 70) return;
    setFormData({ ...formData, age });
  };

  const handleExperienceChange = (value: string) => {
    const experience = parseInt(value);
    if (isNaN(experience) || experience < 0 || experience > 50) return;
    setFormData({ ...formData, experience });
  };

  return (
    <FormSection>
      {/* Age / Experience / Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {t("client_forms.age")} *
            </p>
            <FieldError fieldName="age" fieldErrors={fieldErrors} />
          </div>
          <input
            type="number"
            min="14"
            max="70"
            value={formData.age || ""}
            onChange={(e) => handleAgeChange(e.target.value)}
            className={inputClass("age")}
            placeholder="25"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">14-70 yosh</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.experience")}
          </p>
          <input
            type="number"
            min="0"
            max="50"
            value={formData.experience || ""}
            onChange={(e) => handleExperienceChange(e.target.value)}
            className={`w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`}
            placeholder="3"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">Yil hisobida</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.gender")}
          </p>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as Gender })
            }
            className={`w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`}
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
          onChange={(val) => onRegionChange(val as number)}
          onSearch={onRegionSearch}
          loading={isRegionLoading}
          error={fieldErrors["region_id"]}
          errorMessage={t("client_forms.required")}
          placeholder={t("client_forms.select_region")}
        />
      </div>

      {/* Districts — daily job seeker only, after region selected */}
      {isDailyJobSeeker && formData.region_id > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1 text-gray-700">
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
          <p className="text-[9px] text-gray-400 mt-2 ml-1">
            {t("client_forms.districts_help")}
          </p>
        </div>
      )}

      {/* Daily job seeker specific: additional workers + work types */}
      {isDailyJobSeeker && (
        <>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
              {t("client_forms.additional_workers")}
            </p>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.additional_workers === 0 ? "" : formData.additional_workers}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                if (val >= 0 && val <= 100) {
                  setFormData({ ...formData, additional_workers: val });
                }
              }}
              onFocus={(e) => {
                if (formData.additional_workers === 0) e.target.value = "";
              }}
              onBlur={(e) => {
                if (e.target.value === "") setFormData({ ...formData, additional_workers: 0 });
              }}
              className={`w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`}
              placeholder="0"
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">
              {t("client_forms.additional_workers_hint")}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1 text-gray-700">
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
            <p className="text-[9px] text-gray-400 mt-2 ml-1">
              Bir nechta ish turini tanlashingiz mumkin
            </p>
          </div>
        </>
      )}

      {/* Portfolio file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
          {t("client_forms.portfolio_file")}
        </p>
        <div className="flex gap-3">
          <input
            type="file"
            ref={portfolioInputRef}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > 10 * 1024 * 1024) {
                alert("Fayl hajmi 10MB dan kichik bo'lishi kerak");
                return;
              }
              onPortfolioFileChange(file || null);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => portfolioInputRef.current?.click()}
            className={`flex-1 p-4 border-2 border-dashed rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] ${
              selectedPortfolioFile || formData.portfolio 
                ? `border-${accentColor.replace("-600", "-400")} bg-${accentColor.replace("-600", "-50")} text-${accentColor}` 
                : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <i className={`fa-solid ${selectedPortfolioFile || formData.portfolio ? "fa-file-check" : "fa-cloud-upload"} text-lg`}></i>
              <span className="text-xs">
                {selectedPortfolioFile
                  ? selectedPortfolioFile.name
                  : formData.portfolio
                    ? t("client_forms.change_file")
                    : t("client_forms.upload_portfolio")}
              </span>
            </div>
          </button>
          {formData.portfolio && (
            <a
              href={formData.portfolio}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
              title="Portfolio ko'rish"
            >
              <i className="fa-solid fa-external-link text-gray-600" />
            </a>
          )}
        </div>
        <p className="text-[9px] text-gray-400 mt-1 ml-1">
          PDF, Word, yoki rasm fayli (maks 10MB)
        </p>
      </div>

      {/* Video file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
          {t("client_forms.video_file")}
        </p>
        <div className="flex gap-3">
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > 50 * 1024 * 1024) {
                alert("Video hajmi 50MB dan kichik bo'lishi kerak");
                return;
              }
              onVideoFileChange(file || null);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className={`flex-1 p-4 border-2 border-dashed rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] ${
              selectedVideoFile || formData.video 
                ? `border-${accentColor.replace("-600", "-400")} bg-${accentColor.replace("-600", "-50")} text-${accentColor}` 
                : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <i className={`fa-solid ${selectedVideoFile || formData.video ? "fa-video" : "fa-cloud-upload"} text-lg`}></i>
              <span className="text-xs">
                {selectedVideoFile
                  ? selectedVideoFile.name
                  : formData.video
                    ? t("client_forms.change_file")
                    : t("client_forms.upload_video")}
              </span>
            </div>
          </button>
          {formData.video && (
            <a
              href={formData.video}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
              title="Video ko'rish"
            >
              <i className="fa-solid fa-play text-gray-600" />
            </a>
          )}
        </div>
        <p className="text-[9px] text-gray-400 mt-1 ml-1">
          Tanishish videosi (maks 50MB)
        </p>
      </div>
    </FormSection>
  );
};

export default ResumeFormFields;
