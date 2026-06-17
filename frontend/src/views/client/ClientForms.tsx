import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Vacancy, Resume, ItemStatus, WorkFormat, WorkType, WorkSchedule, Gender, Profession, Region, District, Work, UserRole } from "../../types.ts";
import { useTranslation } from "react-i18next";
import BasicInfoSection from "../../components/BasicInfoSection.tsx";
import VacancyFormFields from "../../components/VacancyFormFields.tsx";
import ResumeFormFields from "../../components/ResumeFormFields.tsx";
import DescriptionFormSection from "../../components/DescriptionFormSection.tsx";
import ContactsFormSection from "../../components/ContactsFormSection.tsx";
import { professionService } from "../../services/professionService.ts";
import { regionService } from "../../services/regionService.ts";
import { resumeService } from "../../services/resumeService.ts";
import { vacancyService } from "../../services/vacancyService.ts";
import { worksService } from "../../services/worksService.ts";
import { AIWriterSection } from "../../components/AIIntegrated.tsx";

interface ClientFormProps {
  type: "vacancy" | "resume";
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  currentUser?: any;
  userRole?: UserRole;
}

export const ClientItemForm: React.FC<ClientFormProps> = ({
  type,
  initialData,
  onSave,
  onCancel,
  currentUser,
  userRole,
}) => {
  const { t, i18n } = useTranslation();
  const isDailyJobSeeker = userRole === UserRole.DAILY_JOB_SEEKER;

  const getLocalizedName = useCallback(
    (item: any) => {
      const lang = i18n.language?.toLowerCase() || "en";
      return item[`name_${lang}`] || item.name_en || item.name_ru || item.name_uz;
    },
    [i18n.language],
  );

  // ── Default form data ────────────────────────────────────────────────────────
  const getDefaultFormData = () => {
    const telegramHandle = currentUser?.username
      ? currentUser.username.startsWith("@")
        ? currentUser.username
        : `@${currentUser.username}`
      : "";

    if (type === "vacancy") {
      return {
        id: 0, company_name: "", profession_id: 0, region_id: 0,
        status: ItemStatus.ACTIVE, description: "",
        work_format: WorkFormat.REMOTE, work_type: WorkType.FULLTIME,
        work_hours: 40, phone: currentUser?.phone || "",
        telegram: telegramHandle, email: "",
        schedule: WorkSchedule.S_5_2, exp_from: 0, exp_till: 3,
        salary_from: undefined, salary_till: undefined,
        created_at: new Date().toISOString(), viewed_count: 0,
      };
    } else if (isDailyJobSeeker) {
      return {
        id: 0, first_name: currentUser?.first_name || "",
        last_name: currentUser?.last_name || "", middle_name: "",
        age: 20, profession_id: undefined, region_id: 0,
        district_ids: [] as number[], gender: Gender.MALE,
        experience: 0, description: "",
        phone: currentUser?.phone || "", telegram: telegramHandle,
        email: "", portfolio: "", video: "",
        additional_workers: 0, work_ids: [] as number[],
        status: ItemStatus.ACTIVE, created_at: new Date().toISOString(), user_id: 0,
      };
    } else {
      return {
        id: 0, first_name: currentUser?.first_name || "",
        last_name: currentUser?.last_name || "", middle_name: "",
        age: 20, profession_id: 0, region_id: 0, gender: Gender.ANY,
        experience: 0, description: "",
        phone: currentUser?.phone || "", telegram: telegramHandle,
        email: "", portfolio: "", video: "",
        status: ItemStatus.ACTIVE, created_at: new Date().toISOString(), user_id: 0,
      };
    }
  };

  // ── State ────────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<any>(() => {
    if (initialData) {
      const data = { ...initialData };
      if (isDailyJobSeeker && initialData.works)
        data.work_ids = initialData.works.map((w: Work) => w.id);
      if (isDailyJobSeeker && initialData.districts)
        data.district_ids = initialData.districts.map((d: District) => d.id);
      return data;
    }
    return getDefaultFormData();
  });

  const [professions, setProfessions] = useState<Profession[]>(
    initialData?.profession ? [initialData.profession] : [],
  );
  const [regions, setRegions] = useState<Region[]>(
    initialData?.region ? [initialData.region] : [],
  );
  const [works, setWorks] = useState<Work[]>(initialData?.works ?? []);
  const [districts, setDistricts] = useState<District[]>(initialData?.districts ?? []);

  const [isProfLoading, setIsProfLoading] = useState(false);
  const [isRegionLoading, setIsRegionLoading] = useState(false);
  const [isDistrictLoading, setIsDistrictLoading] = useState(false);
  const [isWorksLoading, setIsWorksLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const vacancyImageInputRef = useRef<HTMLInputElement>(null);
  const vacancyVideoInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [selectedPortfolioFile, setSelectedPortfolioFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedVacancyImageFile, setSelectedVacancyImageFile] = useState<File | null>(null);
  const [selectedVacancyVideoFile, setSelectedVacancyVideoFile] = useState<File | null>(null);

  // ── Data fetchers ────────────────────────────────────────────────────────────
  const handleProfessionSearch = useCallback(async (search: string) => {
    setIsProfLoading(true);
    try { setProfessions(await professionService.getProfessions(search)); }
    catch (e) { console.error(e); }
    finally { setIsProfLoading(false); }
  }, []);

  const handleRegionSearch = useCallback(async (search: string) => {
    setIsRegionLoading(true);
    try { setRegions(await regionService.getRegions(search)); }
    catch (e) { console.error(e); }
    finally { setIsRegionLoading(false); }
  }, []);

  const handleDistrictSearch = useCallback(async (regionId: number, search?: string) => {
    if (!regionId) { setDistricts([]); return; }
    setIsDistrictLoading(true);
    try { setDistricts(await regionService.getDistricts(regionId, search)); }
    catch (e) { console.error(e); }
    finally { setIsDistrictLoading(false); }
  }, []);

  const handleWorksSearch = useCallback(async (search: string) => {
    setIsWorksLoading(true);
    try {
      const data = await worksService.getWorks({ search, limit: 100 });
      setWorks(data.items);
    }
    catch (e) { console.error(e); }
    finally { setIsWorksLoading(false); }
  }, []);

  // Always load regions on mount; professions only for non-daily-job-seeker
  useEffect(() => {
    if (!isDailyJobSeeker) handleProfessionSearch("");
    handleRegionSearch("");
  }, [isDailyJobSeeker, handleProfessionSearch, handleRegionSearch]);

  // Load works and districts only for daily job seekers
  useEffect(() => {
    if (!isDailyJobSeeker) return;
    handleWorksSearch("");
    if (initialData?.region_id) handleDistrictSearch(initialData.region_id);
  }, [isDailyJobSeeker, handleWorksSearch, handleDistrictSearch, initialData?.region_id]);

  // ── Options ──────────────────────────────────────────────────────────────────
  const professionOptions = useMemo(
    () => professions.map((p) => ({ value: p.id, label: getLocalizedName(p) })),
    [professions, getLocalizedName],
  );
  const regionOptions = useMemo(
    () => regions.map((r) => ({ value: r.id, label: getLocalizedName(r) })),
    [regions, getLocalizedName],
  );
  const workOptions = useMemo(
    () => works.map((w) => ({ value: w.id, label: getLocalizedName(w) })),
    [works, getLocalizedName],
  );
  const districtOptions = useMemo(
    () => districts.map((d) => ({ value: d.id, label: getLocalizedName(d) })),
    [districts, getLocalizedName],
  );

  // ── Validation ───────────────────────────────────────────────────────────────
  const getRequiredFields = useCallback(() => {
    if (type === "vacancy") {
      return ["company_name", "profession_id", "region_id", "description", "phone", "telegram", "work_hours"];
    }
    if (isDailyJobSeeker) {
      return ["first_name", "last_name", "region_id", "age", "description", "phone", "telegram"];
    }
    return ["first_name", "last_name", "profession_id", "region_id", "age", "description", "phone", "telegram"];
  }, [type, isDailyJobSeeker]);

  const validateForm = useCallback(() => {
    const errors: Record<string, boolean> = {};
    let isValid = true;
    
    for (const field of getRequiredFields()) {
      const value = formData[field];
      if (
        value === "" || value === null || value === undefined ||
        (typeof value === "number" && value === 0 &&
          (field === "profession_id" || field === "region_id"))
      ) {
        errors[field] = true;
        isValid = false;
      }
    }

    // Additional vacancy-specific validation
    if (type === "vacancy") {
      // Work hours validation
      if (!formData.work_hours || formData.work_hours < 1 || formData.work_hours > 80) {
        errors["work_hours"] = true;
        isValid = false;
      }

      // Experience validation
      if (formData.exp_from < 0 || formData.exp_till < 0 || formData.exp_from > formData.exp_till) {
        errors["exp_from"] = true;
        errors["exp_till"] = true;
        isValid = false;
      }

      // Salary validation
      if (formData.salary_from && formData.salary_till && formData.salary_from > formData.salary_till) {
        errors["salary_from"] = true;
        errors["salary_till"] = true;
        isValid = false;
      }
    }

    // Resume-specific validation
    if (type === "resume") {
      // Age validation
      if (!formData.age || formData.age < 14 || formData.age > 70) {
        errors["age"] = true;
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  }, [formData, getRequiredFields, type]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (isSubmittingRef.current) return;
    
    // Validation
    if (!validateForm()) {
      // Birinchi xato maydoniga scroll qilish
      const firstErrorField = getRequiredFields().find(field => {
        const value = formData[field];
        return value === "" || value === null || value === undefined ||
          (typeof value === "number" && value === 0 &&
            (field === "profession_id" || field === "region_id"));
      });
      
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Toast notification ko'rsatish
      alert(t("client_forms.please_fill_required"));
      return;
    }

    // Description uzunligi tekshirish
    if (formData.description) {
      const words = formData.description.trim().split(/\s+/).filter((w: string) => w.length > 0);
      if (words.length < 20) {
        alert("Tavsif kamida 20 ta so'zdan iborat bo'lishi kerak");
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsUploading(true);
    
    try {
      let finalData = { ...formData };
      let uploadErrors = [];

      // Portfolio fayl yuklash
      if (selectedPortfolioFile) {
        try {
          const { url } = await resumeService.uploadPortfolio(selectedPortfolioFile);
          finalData.portfolio = url;
        } catch (error) {
          uploadErrors.push(t("client_forms.failed_upload"));
        }
      }

      // Video fayl yuklash
      if (selectedVideoFile) {
        try {
          const { url } = await resumeService.uploadVideo(selectedVideoFile);
          finalData.video = url;
        } catch (error) {
          uploadErrors.push(t("client_forms.failed_video_upload"));
        }
      }

      // Vacancy uchun rasm va video yuklash
      if (selectedVacancyImageFile) {
        try {
          const { url } = await vacancyService.uploadImage(selectedVacancyImageFile);
          finalData.image_url = url;
        } catch (error) {
          uploadErrors.push("Rasm yuklashda xato");
        }
      }

      if (selectedVacancyVideoFile) {
        try {
          const { url } = await vacancyService.uploadVideo(selectedVacancyVideoFile);
          finalData.video_url = url;
        } catch (error) {
          uploadErrors.push("Video yuklashda xato");
        }
      }

      // Agar fayl yuklashda xato bo'lsa, foydalanuvchiga xabar berish
      if (uploadErrors.length > 0) {
        alert(`Yuklashda xatolar:\n${uploadErrors.join('\n')}\n\nDavom etasizmi?`);
      }

      // Ma'lumotlarni tozalash
      const cleanedData: any = { ...finalData };
      delete cleanedData.profession;
      delete cleanedData.region;
      delete cleanedData.user;
      delete cleanedData.created_at;
      delete cleanedData.updated_at;
      delete cleanedData.viewed_count;
      delete cleanedData.works;
      delete cleanedData.districts;
      
      // Yangi yozuv uchun ID va user_id ni olib tashlash
      if (cleanedData.id === 0) {
        delete cleanedData.id;
        delete cleanedData.user_id;
      }

      // Optional string fieldlarni tozalash (bo'sh stringni null qilish)
      if (cleanedData.email === '' || cleanedData.email === undefined) cleanedData.email = null;
      if (cleanedData.portfolio === '' || cleanedData.portfolio === undefined) cleanedData.portfolio = null;
      if (cleanedData.video === '' || cleanedData.video === undefined) cleanedData.video = null;
      if (cleanedData.middle_name === '' || cleanedData.middle_name === undefined) cleanedData.middle_name = null;
      if (cleanedData.image_url === '' || cleanedData.image_url === undefined) cleanedData.image_url = null;
      if (cleanedData.video_url === '' || cleanedData.video_url === undefined) cleanedData.video_url = null;

      // Resume uchun vacancy fieldlarini olib tashlash va aksincha
      if (type === "resume") {
        delete cleanedData.company_name;
        delete cleanedData.work_format;
        delete cleanedData.work_type;
        delete cleanedData.work_hours;
        delete cleanedData.schedule;
        delete cleanedData.exp_from;
        delete cleanedData.exp_till;
        delete cleanedData.salary_from;
        delete cleanedData.salary_till;
        delete cleanedData.image_url;
        delete cleanedData.video_url;
        // Daily job seeker bo'lmasa, daily-specific fieldlarni olib tashlash
        if (!isDailyJobSeeker) {
          delete cleanedData.work_ids;
          delete cleanedData.district_ids;
          delete cleanedData.additional_workers;
        }
      } else {
        // Vacancy uchun resume fieldlarini olib tashlash
        delete cleanedData.first_name;
        delete cleanedData.last_name;
        delete cleanedData.middle_name;
        delete cleanedData.age;
        delete cleanedData.gender;
        delete cleanedData.experience;
        delete cleanedData.portfolio;
        delete cleanedData.video;
        delete cleanedData.work_ids;
        delete cleanedData.district_ids;
        delete cleanedData.additional_workers;
      }

      // Raqamli fieldlarni tekshirish
      if (cleanedData.profession_id) cleanedData.profession_id = Number(cleanedData.profession_id);
      if (cleanedData.region_id) cleanedData.region_id = Number(cleanedData.region_id);
      if (cleanedData.age) cleanedData.age = Number(cleanedData.age);
      if (cleanedData.experience !== undefined) cleanedData.experience = Number(cleanedData.experience);

      // Phone raqamni formatlash
      if (cleanedData.phone) {
        cleanedData.phone = cleanedData.phone.replace(/\s+/g, ' ').trim();
      }

      // Telegram username ni formatlash
      if (cleanedData.telegram && !cleanedData.telegram.startsWith('@')) {
        cleanedData.telegram = '@' + cleanedData.telegram;
      }

      console.log('Sending data:', cleanedData);
      
      onSave(cleanedData);
    } catch (error) {
      console.error('Submit error:', error);
      alert(t("client_forms.submit_error"));
    } finally {
      isSubmittingRef.current = false;
      setIsUploading(false);
    }
  };

  // ── Colours ──────────────────────────────────────────────────────────────────
  const accentBgClass =
    type === "vacancy" ? "bg-violet-600" : isDailyJobSeeker ? "bg-emerald-600" : "bg-blue-600";
  const ringColor =
    type === "vacancy"
      ? "focus:ring-violet-500"
      : isDailyJobSeeker
        ? "focus:ring-emerald-500"
        : "focus:ring-blue-500";
  const accentColor =
    type === "vacancy" ? "violet-600" : isDailyJobSeeker ? "emerald-600" : "blue-600";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col overflow-y-auto pb-20 animate-in slide-in-from-bottom duration-300">
      <nav className="bg-white border-b border-slate-100 px-4 py-6 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center active:scale-90 transition-all"
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-widest">
          {type === "vacancy"
            ? t("common.vacancy")
            : isDailyJobSeeker
              ? t("nav.daily_job_seekers")
              : t("common.resume")}{" "}
          {initialData ? t("client_forms.edit") : t("client_forms.create")}
        </h1>
        <button
          onClick={handlePublish}
          disabled={isUploading}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all ${accentBgClass} ${isUploading ? "opacity-50" : ""}`}
        >
          {isUploading ? t("client_forms.uploading") : t("client_forms.publish")}
        </button>
      </nav>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-10">
        {/* AI Writer Section - at top of form */}
        {!initialData?.id && (
          <AIWriterSection 
            type={type} 
            userRole={userRole}
            onGenerated={(data) => {
              setFormData((prev: any) => ({ ...prev, ...data }));
            }} 
          />
        )}

        <div className="space-y-8">
          <BasicInfoSection
            type={type}
            isDailyJobSeeker={isDailyJobSeeker}
            formData={formData}
            setFormData={setFormData}
            ringColor={ringColor}
            fieldErrors={fieldErrors}
            professionOptions={professionOptions}
            isProfLoading={isProfLoading}
            onProfessionSearch={handleProfessionSearch}
            regionOptions={regionOptions}
            isRegionLoading={isRegionLoading}
            onRegionSearch={handleRegionSearch}
          />

          {type === "vacancy" ? (
            <VacancyFormFields
              formData={formData}
              setFormData={setFormData}
              ringColor={ringColor}
              accentColor={accentColor}
              fieldErrors={fieldErrors}
              imageInputRef={vacancyImageInputRef}
              videoInputRef={vacancyVideoInputRef}
              selectedImageFile={selectedVacancyImageFile}
              selectedVideoFile={selectedVacancyVideoFile}
              onImageFileChange={setSelectedVacancyImageFile}
              onVideoFileChange={setSelectedVacancyVideoFile}
            />
          ) : (
            <ResumeFormFields
              formData={formData}
              setFormData={setFormData}
              ringColor={ringColor}
              accentColor={accentColor}
              isDailyJobSeeker={isDailyJobSeeker}
              fieldErrors={fieldErrors}
              regionOptions={regionOptions}
              isRegionLoading={isRegionLoading}
              onRegionSearch={handleRegionSearch}
              onRegionChange={(regionId) => {
                setFormData({ ...formData, region_id: regionId, district_ids: [] });
                if (isDailyJobSeeker && regionId) handleDistrictSearch(regionId);
                else setDistricts([]);
              }}
              districtOptions={districtOptions}
              isDistrictLoading={isDistrictLoading}
              workOptions={workOptions}
              isWorksLoading={isWorksLoading}
              portfolioInputRef={portfolioInputRef}
              videoInputRef={videoInputRef}
              selectedPortfolioFile={selectedPortfolioFile}
              selectedVideoFile={selectedVideoFile}
              onPortfolioFileChange={setSelectedPortfolioFile}
              onVideoFileChange={setSelectedVideoFile}
            />
          )}

          <DescriptionFormSection
            type={type}
            isDailyJobSeeker={isDailyJobSeeker}
            formData={formData}
            setFormData={setFormData}
            fieldErrors={fieldErrors}
          />

          <ContactsFormSection
            formData={formData}
            setFormData={setFormData}
            ringColor={ringColor}
            fieldErrors={fieldErrors}
          />
        </div>
      </div>
    </div>
  );
};
