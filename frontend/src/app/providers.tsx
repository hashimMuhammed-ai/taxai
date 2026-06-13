'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: 0 } },
  }));
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px', maxWidth: '400px' } }} />
    </QueryClientProvider>
  );
}