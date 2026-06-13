'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import { useCaFilings, useFilingActions, useTaxRecord, useDocument, useProfile } from '@/lib/hooks';
import { PageHeader, EmptyState, PageSpinner, Badge } from '@/components/ui';
import { FILING_STATUS_LABELS, FILING_STATUS_COLORS, formatDate, formatINR, cn } from '@/lib/utils';
import type { Filing } from '@/lib/types';

function SourceDocumentRow({ documentId }: { documentId: string }) {
  const { data, isLoading } = useDocument(documentId);
  if (isLoading) return <div className="text-xs text-gray-400">Loading document info...</div>;
  if (!data) return <div className="text-xs text-red-500">Failed to load document</div>;
  
  const { document, readUrl } = data;
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs">
      <div className="flex items-center gap-2 text-gray-700 min-w-0">
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate font-medium">{document.originalFilename}</span>
        <Badge className="text-[10px] bg-brand-50 text-brand-700 border-brand-100">{document.type.replace('_', ' ').toUpperCase()}</Badge>
      </div>
      <a 
        href={readUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5 whitespace-nowrap cursor-pointer ml-4"
      >
        View Document <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function FilingDetailsSection({ filing }: { filing: Filing }) {
  const { data: taxRecord, isLoading } = useTaxRecord(filing.taxRecordId);

  if (isLoading) {
    return <div className="text-xs text-gray-500 py-3">Loading tax calculations and documents...</div>;
  }

  if (!taxRecord) {
    return <div className="text-xs text-red-500 py-3">Failed to load tax record details</div>;
  }

  const isSelected = (regime: 'old' | 'new') => filing.selectedRegime === regime;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      {/* Side-by-side Regime Comparison */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tax Calculations Comparison</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Old Regime */}
          <div className={cn("p-4 rounded-xl border text-xs bg-white space-y-2", isSelected('old') ? "ring-2 ring-brand-500 border-brand-500" : "border-gray-200")}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm text-gray-900">Old Regime</span>
              {isSelected('old') && <Badge className="bg-brand-100 text-brand-700">Selected</Badge>}
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Gross Income</span><span className="font-medium">{formatINR(taxRecord.oldRegimeResult.grossIncome)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deductions</span><span className="font-medium text-green-600">-{formatINR(taxRecord.oldRegimeResult.totalDeductions)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Taxable Income</span><span className="font-medium">{formatINR(taxRecord.oldRegimeResult.taxableIncome)}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span>Total Tax</span>
              <span className="text-sm text-gray-900">{formatINR(taxRecord.oldRegimeResult.totalTax)}</span>
            </div>
          </div>

          {/* New Regime */}
          <div className={cn("p-4 rounded-xl border text-xs bg-white space-y-2", isSelected('new') ? "ring-2 ring-brand-500 border-brand-500" : "border-gray-200")}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm text-gray-900">New Regime</span>
              {isSelected('new') && <Badge className="bg-brand-100 text-brand-700">Selected</Badge>}
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Gross Income</span><span className="font-medium">{formatINR(taxRecord.newRegimeResult.grossIncome)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deductions</span><span className="font-medium text-green-600">-{formatINR(taxRecord.newRegimeResult.totalDeductions)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Taxable Income</span><span className="font-medium">{formatINR(taxRecord.newRegimeResult.taxableIncome)}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span>Total Tax</span>
              <span className="text-sm text-gray-900">{formatINR(taxRecord.newRegimeResult.totalTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Documents */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Verification Documents</p>
        {!taxRecord.sourceDocumentIds || taxRecord.sourceDocumentIds.length === 0 ? (
          <p className="text-xs text-gray-400">No verification documents attached.</p>
        ) : (
          <div className="space-y-2">
            {taxRecord.sourceDocumentIds.map((docId: string) => (
              <SourceDocumentRow key={docId} documentId={docId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaFilingCard({ filing }: { filing: Filing }) {
  const actions = useFilingActions();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canAct = filing.status === 'ca_review';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">AY {filing.assessmentYear}</span>
            <Badge className={FILING_STATUS_COLORS[filing.status]}>{FILING_STATUS_LABELS[filing.status]}</Badge>
          </div>
          <p className="text-xs text-gray-400">
            {filing.selectedRegime.toUpperCase()} Regime · Filed {formatDate(filing.createdAt)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            User: <span className="font-medium text-gray-750">{filing.client ? `${filing.client.fullName} (${filing.client.email})` : filing.userId}</span>
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer animate-fade-in"
        >
          {showDetails ? (
            <>
              Hide Details <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              View Details <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Notes history */}
      {filing.notes.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
          {filing.notes.map((n, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-gray-600 capitalize">{n.authorRole}</p>
              <p className="text-xs text-gray-700 mt-0.5">{n.content}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {showDetails && <FilingDetailsSection filing={filing} />}

      {canAct && (
        <div className="mt-4">
          {/* Approve */}
          {!showReject && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => actions.approve.mutate({ id: filing.id, note: note || undefined })}
                className="btn-primary text-xs py-1.5 px-3"
                disabled={actions.approve.isPending}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {actions.approve.isPending ? 'Approving…' : 'Approve Filing'}
              </button>
              <button onClick={() => setShowReject(true)} className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="w-3.5 h-3.5" /> Return to User
              </button>
              <button onClick={() => setShowNote(!showNote)} className="btn-secondary text-xs py-1.5 px-3">
                <MessageSquare className="w-3.5 h-3.5" /> Add Note
              </button>
            </div>
          )}

          {showNote && (
            <div className="mt-3 flex gap-2">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for the user…" className="input text-sm flex-1" />
              <button onClick={() => { actions.addNote.mutate({ id: filing.id, content: note }); setNote(''); setShowNote(false); }} className="btn-primary text-xs px-3" disabled={!note.trim()}>Save</button>
            </div>
          )}

          {/* Reject */}
          {showReject && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-red-600">Return reason (required, min 10 chars):</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="input text-sm"
                rows={3}
                placeholder="Explain what the user needs to fix or provide…"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { actions.reject.mutate({ id: filing.id, reason: rejectReason }); setShowReject(false); setRejectReason(''); }}
                  className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200"
                  disabled={rejectReason.length < 10 || actions.reject.isPending}
                >
                  {actions.reject.isPending ? 'Returning…' : 'Confirm Return'}
                </button>
                <button onClick={() => setShowReject(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {filing.status === 'user_approved' && (
        <div className="flex items-center gap-2 text-green-600 text-sm mt-4">
          <CheckCircle className="w-4 h-4" /> Approved by you
        </div>
      )}
    </div>
  );
}

export default function CaPortalPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useProfile();
  const { data: filings, isLoading: isFilingsLoading } = useCaFilings();

  useEffect(() => {
    if (!isUserLoading && user && user.role !== 'ca') {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const pending = filings?.filter(f => f.status === 'ca_review') ?? [];
  const others = filings?.filter(f => f.status !== 'ca_review') ?? [];

  if (isUserLoading || isFilingsLoading) return <PageSpinner />;
  if (!user || user.role !== 'ca') return null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Client Filings"
        description="Review and approve filings assigned to you"
      />

      {!filings?.length ? (
        <EmptyState icon={ClipboardList} title="No filings assigned" description="Filings assigned to you will appear here" />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Awaiting Your Review</h2>
                <span className="w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-medium">{pending.length}</span>
              </div>
              <div className="space-y-4">{pending.map(f => <CaFilingCard key={f.id} filing={f} />)}</div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Other Filings</h2>
              <div className="space-y-4">{others.map(f => <CaFilingCard key={f.id} filing={f} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}