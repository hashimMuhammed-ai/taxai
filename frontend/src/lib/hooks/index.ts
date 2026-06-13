'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { authApi, dashboardApi, documentsApi, taxApi, gstApi, filingApi, reportApi, userApi, uploadToR2 } from '../api/services';
import { TokenStorage } from '../api/client';
import type { AuthResponse } from '../types';

export function useLogin() {
  const router = useRouter(); const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: ({ data }) => {
      const { tokens, user } = data.data as AuthResponse;
      TokenStorage.set(tokens.accessToken, tokens.refreshToken);
      qc.setQueryData(['user'], user);
      const target = user.role === 'ca' ? '/dashboard/ca' : (user.role === 'admin' ? '/dashboard/admin' : '/dashboard');
      router.push(target);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Login failed'),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (d: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: string;
      workspaceAction?: string;
      workspaceName?: string;
      inviteCode?: string;
    }) => authApi.register(d),
    onSuccess: ({ data }) => {
      const { tokens, user } = data.data as AuthResponse;
      TokenStorage.set(tokens.accessToken, tokens.refreshToken);
      const target = user.role === 'ca' ? '/dashboard/ca' : (user.role === 'admin' ? '/dashboard/admin' : '/dashboard');
      router.push(target);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Registration failed'),
  });
}

export function useLogout() {
  const router = useRouter(); const qc = useQueryClient();
  return useCallback(async () => {
    await authApi.logout().catch(() => { });
    TokenStorage.clear(); qc.clear(); router.push('/auth/login');
  }, [router, qc]);
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => authApi.me().then(r => r.data.data),
    staleTime: 5 * 60 * 1000, retry: false,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then(r => r.data.data),
    staleTime: 30_000, refetchInterval: 60_000,
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getAll().then(r => r.data.data),
    refetchInterval: (query) => {
      const docs = query.state.data as any[];
      const hasProcessing = docs?.some(
        (doc) => doc.status === 'processing' || doc.status === 'pending'
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, documentType, onProgress }: { file: File; documentType: string; onProgress?: (p: number) => void }) => {
      const { data: initData } = await documentsApi.initiateUpload({
        filename: file.name, mimeType: file.type, sizeBytes: file.size, documentType: documentType as any,
      });
      const { documentId, uploadUrl } = initData.data;
      await uploadToR2(uploadUrl, file, onProgress);
      await documentsApi.confirmUpload(documentId);
      return documentId;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Document uploaded and queued for processing'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Upload failed'),
  });
}

export function useTaxEstimate() {
  return useQuery({ queryKey: ['tax', 'estimate'], queryFn: () => taxApi.getEstimate().then(r => r.data.data) });
}

export function useTaxRecord(id: string) {
  return useQuery({
    queryKey: ['tax', id],
    queryFn: () => taxApi.getById(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCalculateTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Parameters<typeof taxApi.calculate>[0]) => taxApi.calculate(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tax'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Tax calculated for both regimes'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Calculation failed'),
  });
}

export function useGstSummary() {
  return useQuery({ queryKey: ['gst', 'summary'], queryFn: () => gstApi.getSummary().then(r => r.data.data) });
}

export function useCalculateGst() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Parameters<typeof gstApi.calculate>[0]) => gstApi.calculate(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gst'] }); toast.success('GST calculated and saved'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Calculation failed'),
  });
}
export function useFilings(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['filings'],
    queryFn: () => filingApi.getMyFilings().then(r => r.data.data),
    refetchInterval,
  });
}

export function useCaFilings() {
  return useQuery({ queryKey: ['ca-filings'], queryFn: () => filingApi.getCaFilings().then(r => r.data.data) });
}

export function useCreateFiling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Parameters<typeof filingApi.create>[0]) => filingApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filings'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Filing created'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create filing'),
  });
}

export function useFilingActions() {
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['filings'] }); qc.invalidateQueries({ queryKey: ['ca-filings'] }); };
  return {
    approve: useMutation({ mutationFn: ({ id, note }: { id: string; note?: string }) => filingApi.approve(id, note), onSuccess: () => { inv(); toast.success('Filing approved'); } }),
    reject: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => filingApi.reject(id, reason), onSuccess: () => { inv(); toast.success('Filing returned to user'); } }),
    submit: useMutation({ mutationFn: ({ id, caId }: { id: string; caId: string }) => filingApi.submitForReview(id, caId), onSuccess: () => { inv(); toast.success('Submitted for CA review'); } }),
    addNote: useMutation({ mutationFn: ({ id, content }: { id: string; content: string }) => filingApi.addNote(id, content), onSuccess: () => inv() }),
    prepare: useMutation({ mutationFn: (id: string) => filingApi.prepare(id), onSuccess: () => { inv(); toast.success('Filing prepared successfully'); } }),
  };
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Parameters<typeof reportApi.generate>[0]) => reportApi.generate(d),
    onSuccess: () => {
      toast.success("Report generation started. You'll be notified when ready.");
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['filings'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }, 2500);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed'),
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (filingId: string) => reportApi.getDownloadUrl(filingId).then(r => r.data.data),
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to get download URL'),
  });
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => userApi.getProfile().then(r => r.data.data) });
}

export function useCAs() {
  return useQuery({ queryKey: ['cas'], queryFn: () => userApi.getCas().then(r => r.data.data) });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Parameters<typeof userApi.updateProfile>[0]) => userApi.updateProfile(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); qc.invalidateQueries({ queryKey: ['user'] }); toast.success('Profile updated'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Update failed'),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => userApi.changePassword(current, next),
    onSuccess: () => toast.success('Password changed. Please log in again on other devices.'),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Change failed'),
  });
}
