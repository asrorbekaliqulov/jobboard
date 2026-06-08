
import { Vacancy, Resume, User, UserRole } from '../types.ts';

// Replace with your actual FastAPI production URL
const API_BASE_URL = 'https://your-fastapi-backend.com/api';
// export const mainApi="http://ishkoop.abrorjon.uz"
export const mainApi=""
/**
 * Helper to get Telegram InitData for backend authentication
 * TMAs should always send this to the backend for validation.
 */
import i18n from '../i18n.ts';

// ...

const getAuthHeaders = () => {
  const tg = (window as any).Telegram?.WebApp;
  return {
    'Content-Type': 'application/json',
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
