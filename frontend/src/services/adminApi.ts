import { Profession, Region, District, Work } from '../types.ts';
import { mainApi } from './api.ts';
import { authService } from './auth.ts';

const API_BASE_URL = mainApi+'/api/v1/admin';

const getAuthHeaders = () => {
    const token = authService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

export const adminApi = {
    // Users
    users: {
        list: async (search?: string, isActive?: boolean, isBlocked?: boolean, page: number = 1, perPage: number = 10): Promise<{ items: any[], total: number }> => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (isActive !== undefined) params.append('is_active', isActive.toString());
            if (isBlocked !== undefined) params.append('is_blocked', isBlocked.toString());
            params.append('skip', ((page - 1) * perPage).toString());
            params.append('limit', perPage.toString());

            const res = await fetch(`${API_BASE_URL}/users/?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        },
        create: async (data: any): Promise<any> => {
            const res = await fetch(`${API_BASE_URL}/users/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create user');
            return res.json();
        },
        update: async (id: string | number, data: any): Promise<any> => {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update user');
            return res.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete user');
        }
    },

    // Professions
    professions: {
        list: async (search?: string, isActive?: boolean, page: number = 1, perPage: number = 10): Promise<{ items: Profession[], total: number }> => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (isActive !== undefined) params.append('is_active', isActive.toString());
            params.append('skip', ((page - 1) * perPage).toString());
            params.append('limit', perPage.toString());
            const res = await fetch(`${API_BASE_URL}/professions/?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch professions');
            return res.json();
        },
        create: async (data: Omit<Profession, 'id'>): Promise<Profession> => {
            const res = await fetch(`${API_BASE_URL}/professions/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create profession');
            return res.json();
        },
        update: async (id: string | number, data: Partial<Profession>): Promise<Profession> => {
            const res = await fetch(`${API_BASE_URL}/professions/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update profession');
            return res.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/professions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete profession');
        }
    },

    // Regions
    regions: {
        list: async (search?: string, isActive?: boolean, page: number = 1, perPage: number = 10): Promise<{ items: Region[], total: number }> => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (isActive !== undefined) params.append('is_active', isActive.toString());
            params.append('skip', ((page - 1) * perPage).toString());
            params.append('limit', perPage.toString());
            const res = await fetch(`${API_BASE_URL}/regions/?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch regions');
            return res.json();
        },
        create: async (data: Omit<Region, 'id' | 'districts'>): Promise<Region> => {
            const { name_uz, name_ru, name_en, is_active } = data as any;
            const res = await fetch(`${API_BASE_URL}/regions/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name_uz, name_ru, name_en, is_active }),
            });
            if (!res.ok) throw new Error('Failed to create region');
            return res.json();
        },
        update: async (id: string | number, data: Partial<Region>): Promise<Region> => {
            const { name_uz, name_ru, name_en, is_active } = data as any;
            const payload: any = {};
            if (name_uz !== undefined) payload.name_uz = name_uz;
            if (name_ru !== undefined) payload.name_ru = name_ru;
            if (name_en !== undefined) payload.name_en = name_en;
            if (is_active !== undefined) payload.is_active = is_active;

            const res = await fetch(`${API_BASE_URL}/regions/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to update region');
            return res.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/regions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete region');
        }
    },

    // Districts
    districts: {
        list: async (regionId?: number | string, search?: string, isActive?: boolean, page: number = 1, perPage: number = 10): Promise<{ items: District[], total: number }> => {
            const params = new URLSearchParams();
            if (regionId) params.append('region_id', regionId.toString());
            if (search) params.append('search', search);
            if (isActive !== undefined) params.append('is_active', isActive.toString());
            params.append('skip', ((page - 1) * perPage).toString());
            params.append('limit', perPage.toString());
            const res = await fetch(`${API_BASE_URL}/districts/?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch districts');
            return res.json();
        },
        create: async (data: Omit<District, 'id'>): Promise<District> => {
            const res = await fetch(`${API_BASE_URL}/districts/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create district');
            return res.json();
        },
        update: async (id: string | number, data: Partial<District>): Promise<District> => {
            const res = await fetch(`${API_BASE_URL}/districts/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update district');
            return res.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/districts/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete district');
        }
    },

    // Works
    works: {
        list: async (search?: string, isActive?: boolean, page: number = 1, perPage: number = 10): Promise<{ items: Work[], total: number }> => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (isActive !== undefined) params.append('is_active', isActive.toString());
            params.append('skip', ((page - 1) * perPage).toString());
            params.append('limit', perPage.toString());
            const res = await fetch(`${API_BASE_URL}/works/?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch works');
            return res.json();
        },
        create: async (data: Omit<Work, 'id'>): Promise<Work> => {
            const res = await fetch(`${API_BASE_URL}/works/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create work');
            return res.json();
        },
        update: async (id: string | number, data: Partial<Work>): Promise<Work> => {
            const res = await fetch(`${API_BASE_URL}/works/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update work');
            return res.json();
        },
        delete: async (id: string | number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/works/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete work');
        }
    }
};
