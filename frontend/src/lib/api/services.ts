import apiClient from './client';
import type {
  ApiResponse, AuthResponse, UserProfile, TaxDocument, DocumentType,
  UploadInitiateResponse, TaxRecord, GstRecord, Filing, FilingStatus,
  DashboardSummary, ChatMessage,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    email: string; password: string;
    firstName: string; lastName: string; role?: string;
    workspaceAction?: string;
    workspaceName?: string;
    inviteCode?: string;
  }) => apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),

  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<ApiResponse<UserProfile>>('/auth/me'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: () => apiClient.get<ApiResponse<DashboardSummary>>('/dashboard'),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentsApi = {
  initiateUpload: (data: {
    filename: string; mimeType: string;
    sizeBytes: number; documentType: DocumentType;
  }) => apiClient.post<ApiResponse<UploadInitiateResponse>>('/documents/upload/initiate', data),

  confirmUpload: (documentId: string) =>
    apiClient.post<ApiResponse<{ queued: boolean }>>(`/documents/upload/confirm/${documentId}`),

  getAll: () => apiClient.get<ApiResponse<TaxDocument[]>>('/documents'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<{ document: TaxDocument; readUrl: string }>>(`/documents/${id}`),
};

// Upload a file directly to R2 using the pre-signed URL (no auth header needed)
export const uploadToR2 = async (
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
};

// ─── Tax ─────────────────────────────────────────────────────────────────────
export const taxApi = {
  calculate: (data: {
    assessmentYear: string;
    grossSalary: number;
    otherIncome: number;
    regime: 'old' | 'new';
    deductions?: Record<string, number>;
    sourceDocumentIds?: string[];
  }) => apiClient.post<ApiResponse<TaxRecord>>('/tax/calculate', data),

  getEstimate: (assessmentYear?: string) =>
    apiClient.get<ApiResponse<TaxRecord | null>>('/tax/estimate', {
      params: assessmentYear ? { assessmentYear } : undefined,
    }),

  getById: (id: string) => apiClient.get<ApiResponse<TaxRecord>>(`/tax/${id}`),
};

// ─── GST ─────────────────────────────────────────────────────────────────────
export const gstApi = {
  calculate: (data: {
    baseAmount: number; gstRate: number;
    vendorState: string; buyerState: string;
    invoiceNumber: string; vendorName: string;
    invoiceDate: string; vendorGstin?: string; buyerGstin?: string;
    sourceDocumentId?: string;
  }) => apiClient.post<ApiResponse<GstRecord>>('/gst/calculate', data),

  getSummary: () =>
    apiClient.get<ApiResponse<{ records: GstRecord[]; summary: Record<string, number> }>>('/gst/summary'),
};

// ─── Filing ───────────────────────────────────────────────────────────────────
export const filingApi = {
  create: (data: { assessmentYear: string; taxRecordId: string; selectedRegime: 'old' | 'new' }) =>
    apiClient.post<ApiResponse<Filing>>('/filings', data),

  getMyFilings: () => apiClient.get<ApiResponse<Filing[]>>('/filings'),

  getById: (id: string) => apiClient.get<ApiResponse<Filing>>(`/filings/${id}`),

  submitForReview: (id: string, caId: string) =>
    apiClient.post<ApiResponse<Filing>>(`/filings/${id}/submit`, { caId }),

  prepare: (id: string) =>
    apiClient.post<ApiResponse<Filing>>(`/filings/${id}/prepare`),

  addNote: (id: string, content: string) =>
    apiClient.post<ApiResponse<Filing>>(`/filings/${id}/notes`, { content }),

  approve: (id: string, note?: string) =>
    apiClient.patch<ApiResponse<Filing>>(`/filings/${id}/approve`, { note }),

  reject: (id: string, reason: string) =>
    apiClient.patch<ApiResponse<Filing>>(`/filings/${id}/reject`, { reason }),

  getCaFilings: () => apiClient.get<ApiResponse<Filing[]>>('/filings/ca/assigned'),

  getAuditTrail: (id: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/filings/${id}/audit`),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportApi = {
  generate: (data: { taxRecordId: string; assessmentYear: string; filingId?: string }) =>
    apiClient.post<ApiResponse<{ jobId: string; message: string }>>('/reports/generate', data),

  getDownloadUrl: (filingId: string) =>
    apiClient.get<ApiResponse<{ downloadUrl: string; expiresIn: number }>>(`/reports/download/${filingId}`),
};

// ─── User ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => apiClient.get<ApiResponse<UserProfile>>('/users/profile'),

  getCas: () => apiClient.get<ApiResponse<UserProfile[]>>('/users/cas'),

  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    apiClient.patch<ApiResponse<UserProfile>>('/users/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<ApiResponse<{ success: boolean }>>('/users/change-password', {
      currentPassword, newPassword,
    }),
};



// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, history: { role: string; content: string }[], context?: Record<string, string>) =>
    apiClient.post<ApiResponse<{ message: string; tokensUsed: number }>>('/ai/chat', {
      message, history, ...context,
    }),

  // Returns the base URL for SSE streaming — called via EventSource/fetch
  getStreamUrl: () => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/ai/chat/stream`,
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => apiClient.get<ApiResponse<Record<string, unknown>>>('/admin/stats'),
  getUsers: (page = 1, limit = 20) =>
    apiClient.get<ApiResponse<UserProfile[]>>('/admin/users', { params: { page, limit } }),
  getFilings: (status?: string, page = 1, limit = 20) =>
    apiClient.get<ApiResponse<Filing[]>>('/admin/filings', { params: { status, page, limit } }),
};