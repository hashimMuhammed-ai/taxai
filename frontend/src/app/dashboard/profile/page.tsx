'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useProfile, useUpdateProfile, useChangePassword } from '@/lib/hooks';
import { PageHeader, PageSpinner } from '@/components/ui';

const profileSchema = z.object({
  firstName: z.string().min(2,'At least 2 characters'),
  lastName: z.string().min(2,'At least 2 characters'),
  phone: z.string().optional(),
});
const pwSchema = z.object({
  currentPassword: z.string().min(1,'Required'),
  newPassword: z.string().min(8,'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,'Needs uppercase, lowercase, number'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, { message:'Passwords do not match', path:['confirm'] });

type PF = z.infer<typeof profileSchema>;
type PW = z.infer<typeof pwSchema>;

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePw = useChangePassword();

  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const togglePasswordVisibility = (field: string) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'ca':
        return 'Chartered Accountant';
      default:
        return 'Taxpayer';
    }
  };

  const pf = useForm<PF>({ resolver: zodResolver(profileSchema), values: profile ? { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '' } : undefined });
  const pw = useForm<PW>({ resolver: zodResolver(pwSchema) });

  if (isLoading) return <PageSpinner />;
  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile" description="Manage your account details" />

      {/* Profile info */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{profile.fullName}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <span className="text-xs bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full font-medium">{getRoleLabel(profile.role)}</span>
            </div>
          </div>
          {!isEditingProfile && (
            <button 
              type="button" 
              onClick={() => setIsEditingProfile(true)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Edit Profile
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">First Name</span>
                <span className="text-sm font-medium text-gray-900 mt-0.5 block">{profile.firstName}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Name</span>
                <span className="text-sm font-medium text-gray-900 mt-0.5 block">{profile.lastName}</span>
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Email Address</span>
              <span className="text-sm font-medium text-gray-900 mt-0.5 block">{profile.email}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone Number</span>
              <span className="text-sm font-medium text-gray-900 mt-0.5 block">{profile.phone || 'Not provided'}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={pf.handleSubmit(d => updateProfile.mutate(d, { onSuccess: () => setIsEditingProfile(false) }))} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-150 mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Edit Profile Details</h2>
              <button 
                type="button" 
                onClick={() => { setIsEditingProfile(false); pf.reset(); }} 
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input {...pf.register('firstName')} className="input" />
                {pf.formState.errors.firstName && <p className="text-red-500 text-xs mt-1">{pf.formState.errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input {...pf.register('lastName')} className="input" />
                {pf.formState.errors.lastName && <p className="text-red-500 text-xs mt-1">{pf.formState.errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={profile.email} disabled className="input bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...pf.register('phone')} className="input" placeholder="+91 98765 43210" />
            </div>
            <button type="submit" className="btn-primary" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* Workspace Settings */}
      {profile.workspaceName && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Workspace Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage your corporate workspace</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
              Active Workspace
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Workspace Name</span>
              <span className="text-base font-semibold text-gray-900 mt-1 block">{profile.workspaceName}</span>
            </div>
            {profile.inviteCode && (
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Invite Code</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-mono font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded border border-brand-150 tracking-wider">
                    {profile.inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(profile.inviteCode!, 'inviteCode')}
                    className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors border border-gray-150"
                    title="Copy Invite Code"
                  >
                    {copiedField === 'inviteCode' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Share this code to invite team members to your workspace.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change password */}
      {!isPasswordFormOpen ? (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Password & Security</h2>
              <p className="text-xs text-gray-500 mt-0.5">Update your password to keep your account secure</p>
            </div>
            <button 
              onClick={() => setIsPasswordFormOpen(true)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Change Password
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150">
            <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
            <button 
              type="button" 
              onClick={() => { setIsPasswordFormOpen(false); pw.reset(); }} 
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={pw.handleSubmit(d => changePw.mutate({ current: d.currentPassword, next: d.newPassword }, { onSuccess: () => { setIsPasswordFormOpen(false); pw.reset(); } }))} className="space-y-4">
            {[
              { f:'currentPassword' as const, l:'Current Password' },
              { f:'newPassword' as const, l:'New Password' },
              { f:'confirm' as const, l:'Confirm New Password' },
            ].map(({ f, l }) => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                <div className="relative">
                  <input 
                    {...pw.register(f)} 
                    type={showPassword[f] ? "text" : "password"} 
                    className="input pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(f)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword[f] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pw.formState.errors[f] && <p className="text-red-500 text-xs mt-1">{pw.formState.errors[f]?.message}</p>}
              </div>
            ))}
            <button type="submit" className="btn-secondary" disabled={changePw.isPending}>
              {changePw.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Account info */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Account Information</h2>
            {profile.lastLoginAt && (
              <p className="text-xs text-gray-500 mt-0.5">
                Last logged in: {new Date(profile.lastLoginAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={() => setShowTechnicalInfo(!showTechnicalInfo)}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            {showTechnicalInfo ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {showTechnicalInfo && (
          <div className="pt-4 border-t border-gray-100 space-y-3 text-sm transition-all duration-300">
            <div className="flex justify-between items-center">
              <span className="text-gray-550">User ID</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-mono text-xs select-all bg-gray-50 px-2 py-1 rounded border border-gray-150">{profile.id}</span>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(profile.id, 'userId')}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Copy User ID"
                >
                  {copiedField === 'userId' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-550">Tenant ID</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-mono text-xs select-all bg-gray-50 px-2 py-1 rounded border border-gray-150">{profile.tenantId}</span>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(profile.tenantId, 'tenantId')}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Copy Tenant ID"
                >
                  {copiedField === 'tenantId' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}