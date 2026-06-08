import React from "react";
import { useTranslation } from "react-i18next";
import { WorkFormat, WorkType, WorkSchedule } from "../types.ts";
import FormSection from "./FormSection.tsx";

interface VacancyFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  ringColor: string;
  accentColor: string;
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
  imageInputRef,
  videoInputRef,
  selectedImageFile,
  selectedVideoFile,
  onImageFileChange,
  onVideoFileChange,
}) => {
  const { t } = useTranslation();

  const selectClass = `w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`;
  const inputClass = `w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`;

  return (
    <FormSection>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
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
                {t(`client_forms.work_format_options.${f}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
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
                {t(`client_forms.work_type_options.${f}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
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
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.hrs_wk")}
          </p>
          <input
            required
            type="number"
            value={formData.work_hours}
            onChange={(e) =>
              setFormData({ ...formData, work_hours: parseInt(e.target.value) })
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.exp_from")}
          </p>
          <input
            type="number"
            value={formData.exp_from}
            onChange={(e) =>
              setFormData({ ...formData, exp_from: parseInt(e.target.value) })
            }
            className={inputClass}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.exp_till")}
          </p>
          <input
            type="number"
            value={formData.exp_till}
            onChange={(e) =>
              setFormData({ ...formData, exp_till: parseInt(e.target.value) })
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.salary_from")}
          </p>
          <input
            type="number"
            value={formData.salary_from || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                salary_from: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className={inputClass}
            placeholder={t("common.optional")}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
            {t("client_forms.salary_till")}
          </p>
          <input
            type="number"
            value={formData.salary_till || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                salary_till: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className={inputClass}
            placeholder={t("common.optional")}
          />
        </div>
      </div>

      {/* Image file */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">
          {t("client_forms.image_file")}
        </p>
        <div className="flex gap-2">
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => onImageFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`flex-1 p-4 bg-white border border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-${accentColor} transition-colors`}
          >
            {selectedImageFile
              ? selectedImageFile.name
              : formData.image_url
                ? t("client_forms.change_file")
                : t("client_forms.upload_image")}
          </button>
          {formData.image_url && (
            <a
              href={formData.image_url}
              target="_blank"
              rel="noreferrer"
              className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center"
            >
              <i className="fa-solid fa-image" />
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
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className={`flex-1 p-4 bg-white border border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-${accentColor} transition-colors`}
          >
            {selectedVideoFile
              ? selectedVideoFile.name
              : formData.video_url
                ? t("client_forms.change_file")
                : t("client_forms.upload_video")}
          </button>
          {formData.video_url && (
            <a
              href={formData.video_url}
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

export default VacancyFormFields;
