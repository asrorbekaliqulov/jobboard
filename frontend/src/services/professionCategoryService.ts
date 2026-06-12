/**
 * @deprecated - Use professionService.getTree() instead.
 * This file is kept only for import compatibility during transition.
 */
import { Profession } from '../types';
import { professionService } from './professionService';

class ProfessionCategoryService {
    async getCategoriesTree(): Promise<Profession[]> {
        return professionService.getTree();
    }

    async getSubcategories(parentId: number): Promise<Profession[]> {
        const tree = await professionService.getTree();
        const parent = tree.find(p => p.id === parentId);
        return parent?.children || [];
    }
}

export const professionCategoryService = new ProfessionCategoryService();
