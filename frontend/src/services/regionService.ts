import { Region, District } from '../types';
import { mainApi } from './api';
import { authService } from './auth';

const API_URL = mainApi + '/api/v1/regions';

class RegionService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async getRegions(search?: string): Promise<Region[]> {
        const query = new URLSearchParams();
        if (search) {
            query.append('search', search);
        }

        const response = await fetch(`${API_URL}/?${query.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch regions');
        }

        const json = await response.json();
        // Handle both paginated response {items: [...]} and direct array response
        return Array.isArray(json) ? json : (json.items || []);
    }

    async getDistricts(regionId?: number, search?: string): Promise<District[]> {
        const query = new URLSearchParams();
        if (regionId) {
            query.append('region_id', regionId.toString());
        }
        if (search) {
            query.append('search', search);
        }

        const response = await fetch(`${API_URL}/districts?${query.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch districts');
        }

        const json = await response.json();
        return Array.isArray(json) ? json : (json.items || []);
    }
}

export const regionService = new RegionService();
