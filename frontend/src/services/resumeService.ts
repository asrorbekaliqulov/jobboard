import { Resume, ResumeStatus } from '../types';
import { mainApi } from './api';
import { authService } from './auth';

const API_URL = mainApi + '/api/v1/resumes';

class ResumeService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async getResumes(filters: {
        skip?: number;
        limit?: number;
        user_id?: number;
        profession_id?: number;
        region_id?: number;
        gender?: string;
        status?: ResumeStatus;
        search?: string;
        age_from?: number;
        age_till?: number;
    } = {}): Promise<{ items: Resume[]; total: number }> {
        const query = new URLSearchParams();

        // Handle age range specifically
        if (filters.age_from !== undefined || filters.age_till !== undefined) {
            const from = filters.age_from || 0;
            const till = filters.age_till || 100;
            query.append('age_range', `${from}-${till}`);
        }

        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'age_from' || key === 'age_till') return; // Handled above
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, value.toString());
            }
        });

        const response = await fetch(`${API_URL}/?${query.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch resumes');
        }

        return response.json();
    }

    async getResume(id: number): Promise<Resume> {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch resume');
        }

        return response.json();
    }

    async createResume(resume: Partial<Resume>): Promise<Resume> {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(resume)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create resume');
        }

        return response.json();
    }

    async updateResume(id: number, resume: Partial<Resume>): Promise<Resume> {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(resume)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update resume');
        }

        return response.json();
    }

    async uploadPortfolio(file: File): Promise<{ url: string }> {
        return this.uploadResumeFile(file, 'portfolio');
    }

    async uploadVideo(file: File): Promise<{ url: string }> {
        return this.uploadResumeFile(file, 'video');
    }

    private async uploadResumeFile(file: File, fileType: 'portfolio' | 'video'): Promise<{ url: string }> {
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
            const fallbackMessage = fileType === 'video'
                ? 'Failed to upload video'
                : 'Failed to upload portfolio';
            throw new Error(error.detail || fallbackMessage);
        }

        return response.json();
    }

    async deleteResume(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete resume');
        }
    }

    async registerView(id: number): Promise<void> {
        await fetch(`${mainApi}/api/v1/analytics/resumes/${id}/view`, {
            method: 'POST',
            headers: this.getHeaders()
        });
    }
}

export const resumeService = new ResumeService();
