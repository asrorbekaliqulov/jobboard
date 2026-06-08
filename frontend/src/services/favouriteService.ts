
import { mainApi } from './api';
import { authService } from './auth';

const API_URL = mainApi+'/api/v1/favourite';

class FavouriteService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async getFavouriteVacancies(skip = 0, limit = 100) {
        const response = await fetch(`${API_URL}/vacancies?skip=${skip}&limit=${limit}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch favourite vacancies');
        return response.json();
    }

    async addFavouriteVacancy(vacancyId: number) {
        const response = await fetch(`${API_URL}/vacancies`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ vacancy_id: vacancyId })
        });
        if (!response.ok) throw new Error('Failed to add favourite vacancy');
        return response.json();
    }

    async removeFavouriteVacancy(vacancyId: number) {
        const response = await fetch(`${API_URL}/vacancies/${vacancyId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove favourite vacancy');
        return response.json();
    }

    async getFavouriteResumes(skip = 0, limit = 100) {
        const response = await fetch(`${API_URL}/resumes?skip=${skip}&limit=${limit}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch favourite resumes');
        return response.json();
    }

    async addFavouriteResume(resumeId: number) {
        const response = await fetch(`${API_URL}/resumes`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ resume_id: resumeId })
        });
        if (!response.ok) throw new Error('Failed to add favourite resume');
        return response.json();
    }

    async removeFavouriteResume(resumeId: number) {
        const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove favourite resume');
        return response.json();
    }

    async getFavouriteDailyJobSeekers(skip = 0, limit = 100) {
        const response = await fetch(`${API_URL}/daily-job-seekers?skip=${skip}&limit=${limit}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch favourite daily job seekers');
        return response.json();
    }

    async addFavouriteDailyJobSeeker(dailyJobSeekerId: number) {
        const response = await fetch(`${API_URL}/daily-job-seekers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ daily_job_seeker_id: dailyJobSeekerId })
        });
        if (!response.ok) throw new Error('Failed to add favourite daily job seeker');
        return response.json();
    }

    async removeFavouriteDailyJobSeeker(dailyJobSeekerId: number) {
        const response = await fetch(`${API_URL}/daily-job-seekers/${dailyJobSeekerId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove favourite daily job seeker');
        return response.json();
    }
}

export const favouriteService = new FavouriteService();
