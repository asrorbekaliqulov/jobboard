
export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  CANDIDATE_HUNTER = 'candidate_hunter',
  DAILY_JOB_SEEKER = 'daily_job_seeker',
  ADMIN = 'admin'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  ANY = 'any'
}

export enum ItemStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

export type ResumeStatus = ItemStatus;
export const ResumeStatus = ItemStatus;

export enum WorkFormat {
  ONSITE = "onsite",
  REMOTE = "remote"
}

export enum WorkType {
  FULLTIME = "fulltime",
  PART_TIME = "part-time"
}

export enum WorkSchedule {
  S_6_1 = "6/1",
  S_5_2 = "5/2",
  S_7_0 = "7/0"
}

export interface User {
  id: number | string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  phone?: string;
  role: UserRole;
  language?: string;
  last_login?: string;
  is_active: boolean;
  is_blocked: boolean;
  is_admin: boolean;
  // Legacy fields for backward compatibility during refactor if needed, otherwise removed
  // status: 'active' | 'suspended'; 
  // bot_blocked: boolean;
}

export interface Profession {
  id: string | number;
  name_uz: string;
  name_ru: string;
  name_en: string;
  is_active: boolean;
  parent_id?: number | null;
  children?: Profession[];
}

export interface District {
  id: string | number;
  name_uz: string;
  name_ru: string;
  name_en: string;
  is_active: boolean;
  region_id: string | number;
  region?: Region;
}

export interface Region {
  id: string | number;
  name_uz: string;
  name_ru: string;
  name_en: string;
  is_active: boolean;
  districts?: District[];
  districts_count?: number;
}

export interface Work {
  id: number | string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  status: boolean;
  parent_id?: number | null;
  children?: Work[];
}

export interface Vacancy {
  id: number;
  company_name: string;
  user_id: number;
  profession_id: number;
  region_id: number;
  status: ItemStatus;
  description: string;
  work_format: WorkFormat;
  work_type: WorkType;
  work_hours: number;
  phone: string;
  telegram: string;
  email?: string;
  schedule: WorkSchedule;
  exp_from: number;
  exp_till: number;
  salary_from?: number;
  salary_till?: number;
  image_url?: string;
  video_url?: string;
  viewed_count: number;
  created_at: string;
  updated_at: string;

  // Optional relations if joined
  profession?: Profession;
  region?: Region;
}

export interface Resume {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age: number;
  profession_id: number;
  region_id: number;
  gender: Gender;
  experience: number;
  description: string;
  phone: string;
  telegram: string;
  email?: string;
  portfolio?: string;
  video?: string;
  status: ItemStatus;
  viewed_count: number;
  created_at: string;
  updated_at: string;

  // Optional relations
  user?: User;
  profession?: Profession;
  region?: Region;
}

export interface DailyJobSeeker {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age: number;
  profession_id: number;
  region_id: number;
  gender: Gender;
  experience: number;
  description: string;
  phone: string;
  telegram: string;
  email?: string;
  portfolio?: string;
  video?: string;
  additional_workers: number;
  status: ItemStatus;
  viewed_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  profession?: Profession;
  region?: Region;
  districts?: District[];
  works?: Work[];
}

export interface Filters {
  region: string;
  profession: string;
  gender: Gender | 'all' | 'All';
  age_range?: string;
  salary_range?: string;
  work_format?: string;
  work_type?: string;
  experience?: string;
  search?: string;
}

export interface AdminFilters {
  search?: string;
  status?: string;
  bot_blocked?: boolean | 'all';
  publisher_phone?: string;
  profession?: string;
}
