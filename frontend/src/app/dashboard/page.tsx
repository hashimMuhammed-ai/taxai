'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Calculator, TrendingUp, AlertCircle, ChevronRight, Upload, Clock, CheckCircle } from 'lucide-react';
import { useDashboard, useProfile } from '@/lib/hooks';
import { useEffect } from 'react';
import { StatCard, EmptyState, PageSpinner, ProgressBar, Badge } from '@/components/ui';
import { formatINR, readinessBg, readinessColor, FILING_STATUS_LABELS, FILING_STATUS_COLORS, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useProfile();
  const { data, isLoading } = useDashboard();

  useEffect(() => {
    if (user) {
      if (user.role === 'ca') {
        router.replace('/dashboard/ca');
      } else if (user.role === 'admin') {
        router.replace('/dashboard/admin');
      }
    }
  }, [user, router]);

  if (isUserLoading || isLoading) return <PageSpinner />;
  if (!user || user.role !== 'user') return null;
  if (!data) return null;
  const { filingReadiness, taxSummary, documents, deductionOpportunities, activeFiling } = data;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">AY {filingReadiness.assessmentYear} overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Filing Readiness" value={`${filingReadiness.score}/100`} sub={filingReadiness.status.replace('_',' ')} icon={Calculator} iconColor={readinessColor(filingReadiness.score)} />
        <StatCard label="Total Tax" value={formatINR(taxSummary?.totalTax, true)} sub={taxSummary?.recommendedRegime ? `${taxSummary.recommendedRegime} regime` : 'Not calculated'} icon={Calculator} iconColor="text-purple-600" />
        <StatCard label="Potential Savings" value={formatINR(taxSummary?.totalPotentialSaving, true)} sub="From deduction gaps" icon={TrendingUp} iconColor="text-green-600" />
        <StatCard label="Documents" value={documents.total} sub={`${documents.extracted} extracted`} icon={FileText} iconColor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filing Readiness */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Filing Readiness</h2>
          <div className="flex items-end gap-2 mb-2">
            <span className={`text-3xl font-bold ${readinessColor(filingReadiness.score)}`}>{filingReadiness.score}</span>
            <span className="text-gray-400 text-sm mb-1">/ 100</span>
          </div>
          <ProgressBar value={filingReadiness.score} barClassName={readinessBg(filingReadiness.score)} />
          {filingReadiness.missingDocuments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Missing</p>
              {filingReadiness.missingDocuments.map((doc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">{doc}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link href="/dashboard/documents" className="btn-primary text-xs py-1.5 px-3">
              <Upload className="w-3 h-3" /> Upload documents
            </Link>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Tax Summary</h2>
            <Link href="/dashboard/tax" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">Details <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {taxSummary ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Recommended</span><span className="font-medium capitalize">{taxSummary.recommendedRegime} Regime</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total Tax</span><span className="font-bold text-gray-900">{formatINR(taxSummary.totalTax)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Effective Rate</span><span className="font-medium">{taxSummary.effectiveTaxRate}%</span></div>
              {(taxSummary.taxSavingBySwitch ?? 0) > 0 && (
                <div className="bg-green-50 rounded-lg p-3 mt-2">
                  <p className="text-green-700 text-xs font-medium">Save {formatINR(taxSummary.taxSavingBySwitch)} by switching to {taxSummary.recommendedRegime} regime</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Calculator} title="Not calculated yet" action={<Link href="/dashboard/tax" className="btn-primary text-xs py-1.5 px-3">Calculate now</Link>} />
          )}
        </div>

        {/* Active Filing */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Active Filing</h2>
            <Link href="/dashboard/filings" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {activeFiling ? (
            <div className="space-y-3">
              <Badge className={FILING_STATUS_COLORS[activeFiling.status]}>{FILING_STATUS_LABELS[activeFiling.status]}</Badge>
              <div className="text-sm text-gray-500">AY {activeFiling.assessmentYear}</div>
              {activeFiling.status === 'ca_review' && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />CA review in progress
                </div>
              )}
              {activeFiling.status === 'user_approved' && (
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />Approved by CA
                </div>
              )}
              <Link href="/dashboard/filings" className="btn-secondary text-xs py-1.5 px-3">View filing</Link>
            </div>
          ) : (
            <EmptyState title="No active filing" description="Create a filing once your tax is calculated" />
          )}
        </div>
      </div>

      {/* Deduction opportunities */}
      {deductionOpportunities.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Tax-Saving Opportunities</h2>
            <span className="text-xs text-gray-400">{deductionOpportunities.length} found</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deductionOpportunities.map((opp, i) => (
              <div key={i} className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-green-800 uppercase">Section {opp.section}</span>
                  <span className="text-sm font-bold text-green-700">{formatINR(opp.potentialSaving)}</span>
                </div>
                <p className="text-xs text-gray-600">{opp.actionRequired}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent uploads */}
      {documents.recentUploads.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Documents</h2>
            <Link href="/dashboard/documents" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {documents.recentUploads.map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</p>
                  </div>
                </div>
                <Badge className={`${DOCUMENT_STATUS_COLORS[doc.status]} flex-shrink-0`}>{doc.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}