import { Vacancy, ItemStatus } from '../types';
import { mainApi } from './api';
import { authService } from './auth';

const API_URL = mainApi + '/api/v1/vacancies';

export interface VacancyListResponse {
    items: Vacancy[];
    total: number;
}

class VacancyService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async getVacancies(params: {
        skip?: number;
        limit?: number;
        user_id?: number;
        profession_id?: number;
        category_id?: number;
        region_id?: number;
        status?: ItemStatus;
        search?: string;
        work_format?: string;
        work_type?: string;
        salary_range?: string;
        experience?: string;
    } = {}): Promise<VacancyListResponse> {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, value.toString());
            }
        });

        const response = await fetch(`${API_URL}/?${query.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch vacancies');
        }

        return response.json();
    }

    async getVacancyById(id: number): Promise<Vacancy> {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch vacancy');
        }

        return response.json();
    }

    private sanitizeVacancyData(data: Partial<Vacancy>) {
        const cleaned: any = { ...data };

        // Remove metadata fields that shouldn't be in POST/PUT body
        delete cleaned.id;
        delete cleaned.created_at;
        delete cleaned.updated_at;
        delete cleaned.viewed_count;
        delete cleaned.profession;
        delete cleaned.region;
        delete cleaned.user;

        // Convert empty strings to null for optional fields (fixes 422 errors)
        if (cleaned.email === '') cleaned.email = null;
        if (cleaned.image_url === '') cleaned.image_url = null;
        if (cleaned.video_url === '') cleaned.video_url = null;
        if (cleaned.salary_from === '') cleaned.salary_from = null;
        if (cleaned.salary_till === '') cleaned.salary_till = null;

        // Ensure numeric fields are numbers
        if (cleaned.profession_id) cleaned.profession_id = Number(cleaned.profession_id);
        if (cleaned.region_id) cleaned.region_id = Number(cleaned.region_id);
        if (cleaned.work_hours) cleaned.work_hours = Number(cleaned.work_hours);
        if (cleaned.exp_from) cleaned.exp_from = Number(cleaned.exp_from);
        if (cleaned.exp_till) cleaned.exp_till = Number(cleaned.exp_till);

        return cleaned;
    }

    async createVacancy(data: Partial<Vacancy>): Promise<Vacancy> {
        const cleanedData = this.sanitizeVacancyData(data);
        const response = await fetch(`${API_URL}/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(cleanedData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(Array.isArray(error.detail) ? error.detail[0].msg : (error.detail || 'Failed to create vacancy'));
        }

        return response.json();
    }

    async updateVacancy(id: number, data: Partial<Vacancy>): Promise<Vacancy> {
        const cleanedData = this.sanitizeVacancyData(data);
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(cleanedData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(Array.isArray(error.detail) ? error.detail[0].msg : (error.detail || 'Failed to update vacancy'));
        }

        return response.json();
    }

    async deleteVacancy(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete vacancy');
        }
    }

    async registerView(id: number): Promise<void> {
        await fetch(`${mainApi}/api/v1/analytics/vacancies/${id}/view`, {
            method: 'POST',
            headers: this.getHeaders()
        });
    }

    async uploadImage(file: File): Promise<{ url: string }> {
        return this.uploadVacancyFile(file, 'image');
    }

    async uploadVideo(file: File): Promise<{ url: string }> {
        return this.uploadVacancyFile(file, 'video');
    }

    private async uploadVacancyFile(file: File, fileType: 'image' | 'video'): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const token = authService.getToken();
        const response = await fetch(`${API_URL}/upload?type=${fileType}`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to upload file');
        }

        return response.json();
    }
}

export const vacancyService = new VacancyService();
