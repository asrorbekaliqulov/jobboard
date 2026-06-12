import { ProfessionCategory } from '../types';
import { mainApi } from './api';
import { authService } from './auth';

const API_URL = mainApi + '/api/v1/profession-categories';

class ProfessionCategoryService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    /**
     * Get all categories as a tree (top-level with nested children).
     * Used for home page category display and filter modal.
     */
    async getCategoriesTree(): Promise<ProfessionCategory[]> {
        const response = await fetch(`${API_URL}/`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profession categories');
        }

        return response.json();
    }

    /**
     * Get subcategories of a specific category.
     */
    async getSubcategories(categoryId: number): Promise<ProfessionCategory[]> {
        const response = await fetch(`${API_URL}/${categoryId}/subcategories`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subcategories');
        }

        return response.json();
    }
}

export const professionCategoryService = new ProfessionCategoryService();
