'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FolderOpen, Plus, MessageSquare, FileText, Clock, Download } from 'lucide-react';
import { useFilings, useCreateFiling, useTaxEstimate, useFilingActions, useGenerateReport, useTaxRecord, useCAs, useDownloadReport } from '@/lib/hooks';
import { PageHeader, EmptyState, PageSpinner, Badge } from '@/components/ui';
import { FILING_STATUS_LABELS, FILING_STATUS_COLORS, formatDate } from '@/lib/utils';
import type { Filing } from '@/lib/types';

const STEPS = ['draft','ai_prepared','ca_review','user_approved','ready_to_file'];

function StatusStepper({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${i <= idx ? 'bg-brand-600' : 'bg-gray-200'}`} />
          {i < STEPS.length - 1 && <div className={`h-0.5 w-4 ${i < idx ? 'bg-brand-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

function FilingCard({
  filing,
  generatingFilingIds,
  onGenerateStart,
}: {
  filing: Filing;
  generatingFilingIds: string[];
  onGenerateStart: (id: string) => void;
}) {
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [selectedCaId, setSelectedCaId] = useState('');
  const [showCaSelect, setShowCaSelect] = useState(false);
  const actions = useFilingActions();
  const report = useGenerateReport();
  const downloadReport = useDownloadReport();
  const { data: taxRecord, isLoading: isTaxLoading } = useTaxRecord(
    filing.status === 'draft' ? filing.taxRecordId : ''
  );
  const { data: cas } = useCAs();
  const isGenerating = generatingFilingIds.includes(filing.id);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">AY {filing.assessmentYear}</span>
            <Badge className={FILING_STATUS_COLORS[filing.status]}>{FILING_STATUS_LABELS[filing.status]}</Badge>
          </div>
          <p className="text-xs text-gray-400">{filing.selectedRegime.toUpperCase()} Regime · Updated {formatDate(filing.updatedAt)}</p>
        </div>
      </div>

      <div className="mb-3">
        <StatusStepper status={filing.status} />
        <p className="text-xs text-gray-400 mt-1">{FILING_STATUS_LABELS[filing.status]}</p>
      </div>

      {filing.rejectionReason && (
        <div className="bg-red-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-700 font-medium">Returned by CA</p>
          <p className="text-xs text-red-600 mt-0.5">{filing.rejectionReason}</p>
        </div>
      )}

      {filing.status === 'draft' && (
        <div className="bg-amber-50/50 rounded-lg p-3.5 mb-3 border border-amber-100/50">
          <p className="text-xs text-amber-800 font-semibold mb-1">Filing Readiness Status</p>
          {isTaxLoading ? (
            <p className="text-xs text-amber-600">Loading readiness details...</p>
          ) : taxRecord ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-medium">Readiness Score:</span>
                <span className={`text-xs font-bold ${taxRecord.filingReadinessScore >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                  {taxRecord.filingReadinessScore}%
                </span>
              </div>
              {taxRecord.missingDocuments.length > 0 ? (
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Missing Documents:</p>
                  <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5 mt-0.5">
                    {taxRecord.missingDocuments.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-green-600 font-medium">All documents verified!</p>
              )}
              {taxRecord.filingReadinessScore >= 80 && taxRecord.missingDocuments.length === 0 ? (
                <button
                  onClick={() => actions.prepare.mutate(filing.id)}
                  className="btn-primary text-xs py-1 px-3 mt-2 bg-amber-600 hover:bg-amber-700 border-none text-white rounded font-medium cursor-pointer"
                  disabled={actions.prepare.isPending}
                >
                  {actions.prepare.isPending ? 'Preparing...' : 'Prepare for Review'}
                </button>
              ) : (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  Please go to the{' '}
                  <a href="/dashboard/tax" className="underline font-bold text-brand-600 hover:text-brand-700">
                    Tax page
                  </a>{' '}
                  to calculate your tax, upload missing documents, and hit the 80% readiness threshold.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-600">Ready to prepare when requirements are met.</p>
          )}
        </div>
      )}

      {filing.notes.length > 0 && (
        <div className="mb-3 space-y-2">
          {filing.notes.slice(-2).map((n, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-gray-600 capitalize">{n.authorRole}</p>
              <p className="text-xs text-gray-700 mt-0.5">{n.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {filing.status === 'ai_prepared' && !showCaSelect && (
          <button
            onClick={() => setShowCaSelect(true)}
            className="btn-primary text-xs py-1.5 px-3"
            disabled={actions.submit.isPending}
          >
            Submit for CA Review
          </button>
        )}

        {filing.status === 'user_approved' && (
          <button
            onClick={() => {
              report.mutate(
                { taxRecordId: filing.taxRecordId, assessmentYear: filing.assessmentYear, filingId: filing.id },
                {
                  onSuccess: () => {
                    onGenerateStart(filing.id);
                  }
                }
              );
            }}
            className="btn-primary text-xs py-1.5 px-3"
            disabled={report.isPending || isGenerating}
          >
            {isGenerating ? (
              <>Generating PDF...</>
            ) : (
              <>
                <FileText className="w-3 h-3" /> Generate PDF Report
              </>
            )}
          </button>
        )}

        {filing.status === 'ready_to_file' && (
          <button
            onClick={() => downloadReport.mutate(filing.id)}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
            disabled={downloadReport.isPending}
          >
            <Download className="w-3.5 h-3.5" /> 
            {downloadReport.isPending ? 'Fetching Link...' : 'Download PDF Report'}
          </button>
        )}

        <button onClick={() => setShowNote(!showNote)} className="btn-secondary text-xs py-1.5 px-3">
          <MessageSquare className="w-3 h-3" /> Add Note
        </button>
      </div>

      {showCaSelect && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3.5">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select a Chartered Accountant (CA)</label>
          <div className="flex gap-2 items-center">
            <select
              value={selectedCaId}
              onChange={e => setSelectedCaId(e.target.value)}
              className="input text-xs py-1.5 px-2 flex-1 bg-white cursor-pointer"
            >
              <option value="">-- Choose CA --</option>
              {cas?.map(ca => (
                <option key={ca.id} value={ca.id}>
                  {ca.fullName} ({ca.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedCaId) {
                  actions.submit.mutate({ id: filing.id, caId: selectedCaId });
                  setShowCaSelect(false);
                }
              }}
              className="btn-primary text-xs py-1.5 px-3"
              disabled={!selectedCaId || actions.submit.isPending}
            >
              Submit
            </button>
            <button
              onClick={() => setShowCaSelect(false)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNote && (
        <div className="mt-3 flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Type a note…"
            className="input text-sm flex-1"
          />
          <button
            onClick={() => { actions.addNote.mutate({ id: filing.id, content: note }); setNote(''); setShowNote(false); }}
            className="btn-primary text-xs px-3"
            disabled={!note.trim() || actions.addNote.isPending}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export default function FilingsPage() {
  const [generatingFilingIds, setGeneratingFilingIds] = useState<string[]>([]);
  const { data: filings, isLoading: isFilingsLoading } = useFilings(generatingFilingIds.length > 0 ? 3000 : false);
  const { data: taxRecord, isLoading: isTaxLoading } = useTaxEstimate();
  const createFiling = useCreateFiling();
  const [showCreate, setShowCreate] = useState(false);

  const isLoading = isFilingsLoading || isTaxLoading;

  useEffect(() => {
    if (!filings || generatingFilingIds.length === 0) return;

    const nextGenerating = generatingFilingIds.filter(id => {
      const filing = filings.find(f => f.id === id);
      if (!filing) return false;
      if (filing.status === 'ready_to_file') {
        toast.success(`Filing report for AY ${filing.assessmentYear} is ready for download!`);
        return false;
      }
      return true;
    });

    if (nextGenerating.length !== generatingFilingIds.length) {
      setGeneratingFilingIds(nextGenerating);
    }
  }, [filings, generatingFilingIds]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="My Filings"
        description="Track your ITR filing status and collaborate with your CA"
        action={taxRecord && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Filing
          </button>
        )}
      />

      {showCreate && taxRecord && (
        <div className="card p-5 border-2 border-brand-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Create Filing</h3>
          <p className="text-sm text-gray-500 mb-4">
            AY {taxRecord.assessmentYear} · <span className="capitalize">{taxRecord.recommendedRegime}</span> Regime Recommended
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { createFiling.mutate({ assessmentYear: taxRecord.assessmentYear, taxRecordId: taxRecord.id, selectedRegime: taxRecord.recommendedRegime }); setShowCreate(false); }}
              className="btn-primary"
              disabled={createFiling.isPending}
            >
              {createFiling.isPending ? 'Creating…' : 'Confirm & Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {!filings?.length ? (
        <EmptyState
          icon={FolderOpen}
          title="No filings yet"
          description="Calculate your tax first, then create a filing to begin the ITR process"
          action={!taxRecord
            ? <a href="/dashboard/tax" className="btn-primary text-sm">Calculate Tax First</a>
            : <button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" />Create Filing</button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filings.map(f => (
            <FilingCard
              key={f.id}
              filing={f}
              generatingFilingIds={generatingFilingIds}
              onGenerateStart={(id) => setGeneratingFilingIds(prev => [...prev, id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}