import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import type { ApiResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// ─── Token management ──────────────────────────────────────────────────────────
export const TokenStorage = {
  getAccess: () => Cookies.get('access_token') ?? null,
  getRefresh: () => Cookies.get('refresh_token') ?? null,
  set: (access: string, refresh: string) => {
    Cookies.set('access_token', access, { expires: 1 / 96, secure: true, sameSite: 'strict' }); // 15 min
    Cookies.set('refresh_token', refresh, { expires: 7, secure: true, sameSite: 'strict' });
  },
  clear: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  },
};

// ─── Axios instance ────────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ─── Request interceptor — inject Bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = TokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — handle 401, refresh token ─────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = TokenStorage.getRefresh();
      if (!refreshToken) {
        TokenStorage.clear();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${API_URL}/auth/refresh`,
          { refreshToken },
        );
        const { accessToken, refreshToken: newRefresh } = data.data;
        TokenStorage.set(accessToken, newRefresh);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        TokenStorage.clear();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;