import { mainApi } from './api.ts';
import { authService } from './auth.ts';

const API_BASE_URL = mainApi + '/api/v1/admin/userbot';

const getAuthHeaders = () => {
    const token = authService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

export interface UserbotChannel {
    id: number;
    account_id: number;
    channel_identifier: string;
    channel_title?: string | null;
    channel_username?: string | null;
    channel_photo_url?: string | null;
    keywords?: string | null;
    is_active: boolean;
    last_message_id?: number | null;
    imported_count: number;
    created_at: string;
    updated_at: string;
}

export interface UserbotAccount {
    id: number;
    name: string;
    phone: string;
    api_id: number;
    status: string;
    is_active: boolean;
    last_error?: string | null;
    created_at: string;
    updated_at: string;
    channels: UserbotChannel[];
}

export interface ActionResult {
    success: boolean;
    status: string;
    message: string;
}

export const userbotApi = {
    accounts: {
        list: async (): Promise<{ items: UserbotAccount[]; total: number }> => {
            const res = await fetch(`${API_BASE_URL}/accounts`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch userbot accounts');
            return res.json();
        },
        create: async (data: { name: string; phone: string; api_id: number; api_hash: string }): Promise<UserbotAccount> => {
            const res = await fetch(`${API_BASE_URL}/accounts`, {
                method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create account');
            return res.json();
        },
        update: async (id: number, data: Partial<{ name: string; phone: string; api_id: number; api_hash: string; is_active: boolean }>): Promise<UserbotAccount> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
                method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update account');
            return res.json();
        },
        remove: async (id: number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to delete account');
        },
        sendCode: async (id: number): Promise<ActionResult> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${id}/send-code`, { method: 'POST', headers: getAuthHeaders(), body: '{}' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Failed to send code');
            return data;
        },
        verifyCode: async (id: number, code: string, password?: string): Promise<ActionResult> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${id}/verify-code`, {
                method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ code, password: password || null }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Failed to verify code');
            return data;
        },
        pollNow: async (id: number): Promise<ActionResult> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${id}/poll`, { method: 'POST', headers: getAuthHeaders(), body: '{}' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Failed to poll');
            return data;
        },
    },
    channels: {
        add: async (accountId: number, data: { channel_identifier: string; keywords?: string; is_active?: boolean }): Promise<UserbotChannel> => {
            const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/channels`, {
                method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to add channel');
            return res.json();
        },
        update: async (channelId: number, data: Partial<{ channel_identifier: string; keywords: string; is_active: boolean }>): Promise<UserbotChannel> => {
            const res = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
                method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update channel');
            return res.json();
        },
        remove: async (channelId: number): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/channels/${channelId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to delete channel');
        },
    },
};
