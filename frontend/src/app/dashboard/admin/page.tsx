'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, Calculator, FolderOpen } from 'lucide-react';
import { adminApi } from '@/lib/api/services';
import { useProfile } from '@/lib/hooks';
import { PageHeader, PageSpinner, StatCard, Badge } from '@/components/ui';
import { FILING_STATUS_COLORS, FILING_STATUS_LABELS, formatDate } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useProfile();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin','stats'],
    queryFn: () => adminApi.getStats().then(r => r.data.data as any),
  });
  const { data: usersData } = useQuery({
    queryKey: ['admin','users'],
    queryFn: () => adminApi.getUsers(1, 10).then(r => r.data as any),
  });
  const { data: filingsData } = useQuery({
    queryKey: ['admin','filings'],
    queryFn: () => adminApi.getFilings(undefined, 1, 10).then(r => r.data as any),
  });

  useEffect(() => {
    if (!isUserLoading && user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isLoading || isUserLoading) return <PageSpinner />;
  if (!user || user.role !== 'admin' || !stats) return null;

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Admin Dashboard" description="Platform-wide overview" />

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users?.total ?? 0} icon={Users} iconColor="text-blue-600" />
        <StatCard label="Documents" value={stats.documents?.total ?? 0} sub={`${stats.documents?.failed ?? 0} failed`} icon={FileText} iconColor="text-purple-600" />
        <StatCard label="Tax Calculations" value={stats.taxCalculations?.total ?? 0} icon={Calculator} iconColor="text-green-600" />
        <StatCard label="Total Filings" value={stats.filings?.total ?? 0} icon={FolderOpen} iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filing pipeline */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Filing Pipeline</h2>
          <div className="space-y-3">
            {Object.entries(stats.filings?.byStatus ?? {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge className={FILING_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}>
                  {FILING_STATUS_LABELS[status] ?? status}
                </Badge>
                <div className="flex items-center gap-3 flex-1 mx-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 bg-brand-500 rounded-full"
                      style={{ width: stats.filings?.total ? `${((count as number) / stats.filings.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-6 text-right">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document breakdown */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Document Status</h2>
          <div className="space-y-3">
            {[
              { label:'Pending', value: stats.documents?.pending ?? 0, color:'bg-gray-400' },
              { label:'Processing', value: stats.documents?.processing ?? 0, color:'bg-blue-500' },
              { label:'Extracted', value: stats.documents?.extracted ?? 0, color:'bg-green-500' },
              { label:'Failed', value: stats.documents?.failed ?? 0, color:'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-gray-600">{label}</span>
                </div>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent users */}
      {usersData?.data?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Users</h2>
          <div className="divide-y divide-gray-50">
            {usersData.data.map((user: any) => (
              <div key={user._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-gray-100 text-gray-700 capitalize">{user.role}</Badge>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent filings */}
      {filingsData?.data?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Filings</h2>
          <div className="divide-y divide-gray-50">
            {filingsData.data.map((filing: any) => (
              <div key={filing._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">AY {filing.assessmentYear}</p>
                  <p className="text-xs text-gray-400 font-mono">{filing._id?.slice(0,12)}…</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={FILING_STATUS_COLORS[filing.status] ?? 'bg-gray-100 text-gray-700'}>
                    {FILING_STATUS_LABELS[filing.status] ?? filing.status}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatDate(filing.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}