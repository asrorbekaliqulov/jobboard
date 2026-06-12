import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { WorkFormat, WorkType, WorkSchedule } from "../types.ts";
import FormSection from "./FormSection.tsx";
import FieldError from "./FieldError.tsx";

interface VacancyFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  ringColor: string;
  accentColor: string;
  fieldErrors: Record<string, boolean>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  selectedImageFile: File | null;
  selectedVideoFile: File | null;
  onImageFileChange: (file: File | null) => void;
  onVideoFileChange: (file: File | null) => void;
}

const VacancyFormFields: React.FC<VacancyFormFieldsProps> = ({
  formData,
  setFormData,
  ringColor,
  accentColor,
  fieldErrors,
  imageInputRef,
  videoInputRef,
  selectedImageFile,
  selectedVideoFile,
  onImageFileChange,
  onVideoFileChange,
}) => {
  const { t } = useTranslation();
  const [salaryError, setSalaryError] = useState("");

  const selectClass = `w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${ringColor}`;
  const inputClass = (field: string) => {
    const hasError = fieldErrors[field];
    return `w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all duration-200 ${
      hasError 
        ? "border-red-400 bg-red-50 text-red-700" 
        : "border-gray-200 bg-white text-gray-900"
    } ${ringColor}`;
  };

  const handleWorkHoursChange = (value: string) => {
    const hours = parseInt(value);
    if (isNaN(hours) || hours < 1 || hours > 80) return;
    setFormData({ ...formData, work_hours: hours });
  };

  const handleExperienceChange = (field: "exp_from" | "exp_till", value: string) => {
    const exp = parseInt(value);
    if (isNaN(exp) || exp < 0 || exp > 50) return;
    
    const newData = { ...formData, [field]: exp };
    
    // Validate experience range
    if (field === "exp_from" && formData.exp_till && exp > formData.exp_till) {
      newData.exp_till = exp;
    }
    if (field === "exp_till" && formData.exp_from && exp < formData.exp_from) {
      newData.exp_from = exp;
    }
    
    setFormData(newData);
  };

  const handleSalaryChange = (field: "salary_from" | "salary_till", value: string) => {
    const salary = value ? parseInt(value) : undefined;
    
    if (value && (isNaN(salary!) || salary! < 0)) return;
    
    const newData = { ...formData, [field]: salary };
    
    // Validate salary range
    if (field === "salary_from" && formData.salary_till && salary && salary > formData.salary_till) {
      setSalaryError("Minimal maosh maksimaldan katta bo'lmasin");
    } else if (field === "salary_till" && formData.salary_from && salary && salary < formData.salary_from) {
      setSalaryError("Maksimal maosh minimaldan kichik bo'lmasin");
    } else {
      setSalaryError("");
    }
    
    setFormData(newData);
  };

  const formatSalary = (value?: number) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return (
    <FormSection>
      {/* Work Format and Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.format")}
          </p>
          <select
            value={formData.work_format}
            onChange={(e) =>
              setFormData({ ...formData, work_format: e.target.value as WorkFormat })
            }
            className={selectClass}
          >
            {Object.values(WorkFormat).map((f) => (
              <option key={f} value={f}>
                {f === WorkFormat.ONSITE ? t("client_forms.work_format_options.onsite") : t("client_forms.work_format_options.remote")}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            {t("client_forms.work_format")}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.type")}
          </p>
          <select
            value={formData.work_type}
            onChange={(e) =>
              setFormData({ ...formData, work_type: e.target.value as WorkType })
            }
            className={selectClass}
          >
            {Object.values(WorkType).map((f) => (
              <option key={f} value={f}>
                {f === WorkType.FULLTIME ? t("client_forms.work_type_options.fulltime") : t("client_forms.work_type_options.part-time")}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            {t("client_forms.work_type")}
          </p>
        </div>
      </div>

      {/* Schedule and Work Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.schedule")}
          </p>
          <select
            value={formData.schedule}
            onChange={(e) =>
              setFormData({ ...formData, schedule: e.target.value as WorkSchedule })
            }
            className={selectClass}
          >
            {Object.values(WorkSchedule).map((s) => (
              <option key={s} value={s}>
                {s === WorkSchedule.S_5_2 ? "5/2 (Bazar, yakshanba dam)" : 
                 s === WorkSchedule.S_6_1 ? "6/1 (Yakshanba dam)" : 
                 "7/0 (Dushanba dan yakshanba)"}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Haftalik ish jadvali
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {t("client_forms.hrs_wk")} *
            </p>
            <FieldError fieldName="work_hours" fieldErrors={fieldErrors} />
          </div>
          <input
            required
            type="number"
            min="1"
            max="80"
            value={formData.work_hours || ""}
            onChange={(e) => handleWorkHoursChange(e.target.value)}
            className={inputClass("work_hours")}
            placeholder="40"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Haftalik ish soatlari (1-80)
          </p>
        </div>
      </div>

      {/* Experience Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.exp_from")}
          </p>
          <input
            type="number"
            min="0"
            max="50"
            value={formData.exp_from || ""}
            onChange={(e) => handleExperienceChange("exp_from", e.target.value)}
            className={inputClass("exp_from")}
            placeholder="0"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Minimal tajriba (yil)
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.exp_till")}
          </p>
          <input
            type="number"
            min="0"
            max="50"
            value={formData.exp_till || ""}
            onChange={(e) => handleExperienceChange("exp_till", e.target.value)}
            className={inputClass("exp_till")}
            placeholder="5"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Maksimal tajriba (yil)
          </p>
        </div>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.salary_from")}
          </p>
          <input
            type="text"
            value={formatSalary(formData.salary_from)}
            onChange={(e) => {
              const value = e.target.value.replace(/\s/g, '');
              handleSalaryChange("salary_from", value);
            }}
            className={inputClass("salary_from")}
            placeholder="5 000 000 (ixtiyoriy)"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Minimal maosh (so'm)
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
            {t("client_forms.salary_till")}
          </p>
          <input
            type="text"
            value={formatSalary(formData.salary_till)}
            onChange={(e) => {
              const value = e.target.value.replace(/\s/g, '');
              handleSalaryChange("salary_till", value);
            }}
            className={inputClass("salary_till")}
            placeholder="10 000 000 (ixtiyoriy)"
          />
          <p className="text-[9px] text-gray-400 mt-1 ml-1">
            Maksimal maosh (so'm)
          </p>
        </div>
      </div>

      {salaryError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600">
            <i className="fa-solid fa-exclamation-triangle text-sm"></i>
            <p className="text-xs font-semibold">{salaryError}</p>
          </div>
        </div>
      )}

      {/* Salary Guidelines */}
      {!formData.salary_from && !formData.salary_till && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600">
            <i className="fa-solid fa-lightbulb text-sm"></i>
            <p className="text-xs font-semibold">Maosh haqida:</p>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Maosh ko'rsatmasangiz, "Kelishiladi" deb chiqadi. Aniq summani ko'rsatish ko'proq kandidat jalb qiladi.
          </p>
        </div>
      )}

      {/* Image file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-gray-700">
          {t("client_forms.image_file")}
        </p>
        <div className="flex gap-3">
          <input
            type="file"
            ref={imageInputRef}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > 5 * 1024 * 1024) {
                alert("Rasm hajmi 5MB dan kichik bo'lishi kerak");
                return;
              }
              onImageFileChange(file || null);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`flex-1 p-4 border-2 border-dashed rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] ${
              selectedImageFile || formData.image_url 
                ? `border-${accentColor.replace("-600", "-400")} bg-${accentColor.replace("-600", "-50")} text-${accentColor}` 
                : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <i className={`fa-solid ${selectedImageFile || formData.image_url ? "fa-image" : "fa-cloud-upload"} text-lg`}></i>
              <span className="text-xs">
                {selectedImageFile
                  ? selectedImageFile.name
                  : formData.image_url
                    ? t("client_forms.change_file")
                    : "Rasm yuklash"}
              </span>
            </div>
          </button>
          {formData.image_url && (
            <a
              href={formData.image_url}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
              title="Rasmni ko'rish"
            >
              <i className="fa-solid fa-external-link text-gray-600" />
            </a>
          )}
        </div>
        <p className="text-[9px] text-gray-400 mt-1 ml-1">
          Kompaniya logosi yoki vakansiya rasmi (maks 5MB)
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
              selectedVideoFile || formData.video_url 
                ? `border-${accentColor.replace("-600", "-400")} bg-${accentColor.replace("-600", "-50")} text-${accentColor}` 
                : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <i className={`fa-solid ${selectedVideoFile || formData.video_url ? "fa-video" : "fa-cloud-upload"} text-lg`}></i>
              <span className="text-xs">
                {selectedVideoFile
                  ? selectedVideoFile.name
                  : formData.video_url
                    ? t("client_forms.change_file")
                    : "Video yuklash"}
              </span>
            </div>
          </button>
          {formData.video_url && (
            <a
              href={formData.video_url}
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
          Kompaniya yoki vakansiya haqida video (maks 50MB)
        </p>
      </div>
    </FormSection>
  );
};

export default VacancyFormFields;
