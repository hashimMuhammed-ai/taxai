'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRegister } from '@/lib/hooks';

const schema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase and a number'),
  role: z.enum(['user', 'ca']).default('user'),
  workspaceAction: z.enum(['create', 'join']).default('create'),
  workspaceName: z.string().optional(),
  inviteCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.workspaceAction === 'create' && (!data.workspaceName || data.workspaceName.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Workspace Name is required when creating a workspace',
      path: ['workspaceName'],
    });
  }
  if (data.workspaceAction === 'join' && (!data.inviteCode || data.inviteCode.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invite Code is required when joining a workspace',
      path: ['inviteCode'],
    });
  }
});
type F = z.infer<typeof schema>;

export default function RegisterPage() {
  const reg = useRegister();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: {
      workspaceAction: 'create',
      role: 'user',
    },
  });

  const workspaceAction = watch('workspaceAction');

  const onSubmit = (data: F) => {
    const payload = { ...data };
    if (payload.workspaceAction === 'create') {
      delete payload.inviteCode;
    } else if (payload.workspaceAction === 'join') {
      delete payload.workspaceName;
    }
    reg.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">TaxAI</h1>
          <p className="text-gray-500 mt-1 text-sm">Start managing your taxes smarter</p>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input {...register('firstName')} className="input" placeholder="Arjun" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input {...register('lastName')} className="input" placeholder="Sharma" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input {...register('password')} type="password" className="input" placeholder="Min 8 chars" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select {...register('role')} className="input py-2 bg-white cursor-pointer">
                <option value="user">Taxpayer (Client)</option>
                <option value="ca">Chartered Accountant (CA)</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Choice</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <label className={`flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${
                  workspaceAction === 'create'
                    ? 'bg-white text-brand-600 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}>
                  <input
                    type="radio"
                    value="create"
                    {...register('workspaceAction')}
                    className="sr-only"
                  />
                  Create Workspace
                </label>
                <label className={`flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${
                  workspaceAction === 'join'
                    ? 'bg-white text-brand-600 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}>
                  <input
                    type="radio"
                    value="join"
                    {...register('workspaceAction')}
                    className="sr-only"
                  />
                  Join Workspace
                </label>
              </div>
            </div>

            {workspaceAction === 'create' ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Company/Workspace Name</label>
                <input
                  {...register('workspaceName')}
                  className="input"
                  placeholder="e.g. Acme Corp"
                />
                {errors.workspaceName && <p className="text-red-500 text-xs mt-1">{errors.workspaceName.message}</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Workspace Invite Code</label>
                <input
                  {...register('inviteCode')}
                  className="input uppercase"
                  placeholder="e.g. ACME2026"
                />
                {errors.inviteCode && <p className="text-red-500 text-xs mt-1">{errors.inviteCode.message}</p>}
              </div>
            )}

            {reg.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">
                  {(reg.error as any)?.response?.data?.error?.message ?? 'Registration failed'}
                </p>
              </div>
            )}
            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={reg.isPending}>
              {reg.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}