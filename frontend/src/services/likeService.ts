/**
 * Like/Reaction Service
 */
import { mainApi } from './api.ts';

const LIKES_BASE = `${mainApi}/api/v1/likes`;

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface LikeResponse {
  liked: boolean;
  like_count: number;
}

export const likeService = {
  toggle: async (entityType: 'vacancy' | 'resume', entityId: number): Promise<LikeResponse> => {
    const res = await fetch(`${LIKES_BASE}/toggle/${entityType}/${entityId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Like failed');
    return res.json();
  },

  getStatus: async (entityType: 'vacancy' | 'resume', entityId: number): Promise<LikeResponse> => {
    const res = await fetch(`${LIKES_BASE}/status/${entityType}/${entityId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { liked: false, like_count: 0 };
    return res.json();
  },
};
