import { mainApi } from "./api";

const API_URL = mainApi + '/api/v1';

export interface TelegramUser {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: {
        id: number;
        telegram_id: number;
        username: string;
        first_name?: string;
        last_name?: string;
        photo_url?: string;
        role: string;
        language?: string;
    };
}

class AuthService {
    private token: string | null = localStorage.getItem('auth_token');

    async login(): Promise<AuthResponse | null> {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg || !tg.initData) {
            console.error('Telegram WebApp is not available or initData is missing');
            return null;
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData: tg.initData }),
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const data: AuthResponse = await response.json();
            this.token = data.access_token;
            localStorage.setItem('auth_token', data.access_token);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return null;
        }
    }

    async loginWithWidget(authData: any): Promise<AuthResponse | null> {
        try {
            const response = await fetch(`${API_URL}/auth/telegram-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(authData),
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const data: AuthResponse = await response.json();
            this.token = data.access_token;
            localStorage.setItem('auth_token', data.access_token);
            return data;
        } catch (error) {
            console.error('Widget Login error:', error);
            return null;
        }
    }

    getToken(): string | null {
        return this.token;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    async updateRole(role: string): Promise<boolean> {
        if (!this.token) {
            console.error('Update role failed: No auth token available');
            return false;
        }
        try {
            const body = JSON.stringify({ role: role.toLowerCase() });
            console.log('Sending role update:', body, 'Token:', this.token?.substring(0, 20) + '...');
            const response = await fetch(`${API_URL}/auth/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body,
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update role failed:', response.status, errorText);
            }
            return response.ok;
        } catch (error) {
            console.error('Update role error:', error);
            return false;
        }
    }

    async updateLanguage(language: string): Promise<boolean> {
        if (!this.token) return false;
        try {
            const response = await fetch(`${API_URL}/auth/language`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ language }),
            });
            return response.ok;
        } catch (error) {
            console.error('Update language error:', error);
            return false;
        }
    }
}

export const authService = new AuthService();
