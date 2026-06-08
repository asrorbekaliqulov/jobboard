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
        // @ts-ignore
        const nameKey = `name_${lang}`;

        return data.sort((a, b) => {
            // @ts-ignore
            const nameA = (a[nameKey] || a.name_en || '').toString().toLowerCase();
            // @ts-ignore
            const nameB = (b[nameKey] || b.name_en || '').toString().toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }
}

export const professionService = new ProfessionService();
