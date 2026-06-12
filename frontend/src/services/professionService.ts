import { Profession } from '../types';
import { mainApi } from './api';
import { authService } from './auth';
import i18n from '../i18n';

const API_URL = mainApi + '/api/v1/professions';

class ProfessionService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async getProfessions(search?: string): Promise<Profession[]> {
        const query = new URLSearchParams();
        if (search) {
            query.append('search', search);
        }

        const response = await fetch(`${API_URL}/?${query.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch professions');
        }

        const json = await response.json();
        // Handle both paginated response {items: [...]} and direct array response
        const data: Profession[] = Array.isArray(json) ? json : (json.items || []);

        const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
        const nameKey = `name_${lang}`;

        return data.sort((a, b) => {
            const nameA = ((a as any)[nameKey] || a.name_en || '').toString().toLowerCase();
            const nameB = ((b as any)[nameKey] || b.name_en || '').toString().toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Get professions as a tree (top-level with nested children).
     * Used for home page category display and filter modal.
     */
    async getTree(): Promise<Profession[]> {
        const response = await fetch(`${API_URL}/tree`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch professions tree');
        }

        return response.json();
    }
}

export const professionService = new ProfessionService();
