'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useLogin } from '@/lib/hooks';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Required'),
});
type F = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">TaxAI</h1>
          <p className="text-gray-500 mt-1 text-sm">Your AI-powered Indian tax assistant</p>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit(d => login.mutate(d))} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input {...register('password')} type="password" className="input" placeholder="••••••••" autoComplete="current-password" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            {login.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">
                  {(login.error as any)?.response?.data?.error?.message ?? 'Invalid email or password'}
                </p>
              </div>
            )}
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-brand-600 hover:text-brand-700 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}