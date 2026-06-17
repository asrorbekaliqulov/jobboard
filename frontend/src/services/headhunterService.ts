/**
 * HeadHunter Integration Service
 * Fetches vacancies from hh.uz API through our backend
 */
import { mainApi } from './api.ts';

const HH_BASE = `${mainApi}/api/v1/hh`;

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface HHVacancy {
  hh_id: string;
  title: string;
  company_name: string;
  salary_from: number | null;
  salary_till: number | null;
  salary_currency: string;
  region: string | null;
  experience: string | null;
  employment_type: string | null;
  description_short: string | null;
  url: string;
  published_at: string | null;
  is_from_hh: boolean;
}

export interface HHVacancyListResponse {
  items: HHVacancy[];
  total: number;
  page: number;
  per_page: number;
  source: string;
}

export const headhunterService = {
  searchVacancies: async (params: {
    query?: string;
    page?: number;
    per_page?: number;
    salary_from?: number;
    salary_to?: number;
    experience?: string;
  }): Promise<HHVacancyListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.per_page !== undefined) searchParams.set('per_page', String(params.per_page));
    if (params.salary_from) searchParams.set('salary_from', String(params.salary_from));
    if (params.salary_to) searchParams.set('salary_to', String(params.salary_to));
    if (params.experience) searchParams.set('experience', params.experience);

    const res = await fetch(`${HH_BASE}/vacancies?${searchParams.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      return { items: [], total: 0, page: 0, per_page: 20, source: 'headhunter.uz' };
    }
    return res.json();
  },

  getVacancyDetail: async (vacancyId: string): Promise<any> => {
    const res = await fetch(`${HH_BASE}/vacancies/${vacancyId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Vakansiya topilmadi');
    return res.json();
  },

  searchSimilar: async (query: string, limit: number = 10): Promise<HHVacancyListResponse> => {
    const searchParams = new URLSearchParams({ query, limit: String(limit) });
    const res = await fetch(`${HH_BASE}/search-similar?${searchParams.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      return { items: [], total: 0, page: 0, per_page: limit, source: 'headhunter.uz' };
    }
    return res.json();
  },
};
