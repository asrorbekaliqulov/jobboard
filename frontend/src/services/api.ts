
import { Vacancy, Resume, User, UserRole } from '../types.ts';
import i18n from '../i18n.ts';

/**
 * Main API base URL - reads from VITE_API_URL env variable.
 * Falls back to empty string for same-origin (when frontend is served from same domain as backend).
 * In production, set VITE_API_URL=https://your-backend.com in .env
 */
export const mainApi = (import.meta as any).env?.VITE_API_URL || "";

// Legacy API_BASE_URL for old api object (not used by main services)
const API_BASE_URL = mainApi + '/api/v1';

/**
 * Helper to get auth headers with token
 */
const getAuthHeaders = () => {
  const tg = (window as any).Telegram?.WebApp;
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-TG-Init-Data': tg?.initData || '',
    'Accept-Language': i18n.language || 'en',
  };
};

export const api = {
  // User Profile
  async getProfile(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Vacancies
  async getVacancies(params?: any): Promise<Vacancy[]> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/vacancies?${query}`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createVacancy(data: Partial<Vacancy>): Promise<Vacancy> {
    const res = await fetch(`${API_BASE_URL}/vacancies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Resumes
  async getResumes(params?: any): Promise<Resume[]> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/resumes?${query}`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createResume(data: Partial<Resume>): Promise<Resume> {
    const res = await fetch(`${API_BASE_URL}/resumes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Saved Items
  async toggleSaveVacancy(vacancyId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/toggle-save`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async toggleSaveResume(resumeId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/resumes/${resumeId}/toggle-save`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  }
};
