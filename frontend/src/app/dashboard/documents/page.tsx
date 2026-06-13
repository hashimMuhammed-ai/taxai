'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useDocuments, useUploadDocument } from '@/lib/hooks';
import { PageHeader, EmptyState, PageSpinner, Badge, Spinner } from '@/components/ui';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_COLORS, formatBytes, formatDate } from '@/lib/utils';
import type { DocumentType } from '@/lib/types';

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value:'form_16', label:'Form 16' }, { value:'salary_slip', label:'Salary Slip' },
  { value:'bank_statement', label:'Bank Statement' }, { value:'investment_proof', label:'Investment Proof' },
  { value:'form_26as', label:'Form 26AS' }, { value:'rent_receipt', label:'Rent Receipt' },
  { value:'invoice', label:'Invoice' }, { value:'other', label:'Other' },
];

export default function DocumentsPage() {
  const { data: docs, isLoading, refetch } = useDocuments();
  const upload = useUploadDocument();
  const [selType, setSelType] = useState<DocumentType>('form_16');
  const [progress, setProgress] = useState<number | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setProgress(0);
    await upload.mutateAsync({ file: files[0], documentType: selType, onProgress: setProgress });
    setProgress(null);
    refetch();
  }, [selType, upload, refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    maxSize: 20*1024*1024, multiple: false, disabled: upload.isPending,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Documents" description="Upload your Form 16, salary slips, investment proofs and more"
        action={<button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button>}
      />

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Document</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {DOC_TYPES.map(({ value, label }) => (
            <button key={value} onClick={() => setSelType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selType === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'} ${upload.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <input {...getInputProps()} />
          {upload.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600">{progress != null && progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}</p>
              {progress != null && (
                <div className="w-48 bg-gray-200 rounded-full h-1.5">
                  <div className="h-1.5 bg-brand-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">{isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, WEBP — max 20 MB</p>
              <p className="text-xs text-brand-600 mt-1 font-medium">Uploading as: {DOC_TYPES.find(t => t.value === selType)?.label}</p>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Your Documents {docs && <span className="ml-1 text-gray-400 font-normal">({docs.length})</span>}</h2>
        </div>
        {!docs?.length ? (
          <EmptyState icon={FileText} title="No documents yet" description="Upload your first document to get started" />
        ) : (
          <div className="divide-y divide-gray-50">
            {docs.map(doc => (
              <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.originalFilename}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-gray-400">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</span>
                      <span className="text-gray-300 hidden sm:inline">·</span>
                      <span className="text-xs text-gray-400">{formatBytes(doc.sizeBytes)}</span>
                      <span className="text-gray-300 hidden sm:inline">·</span>
                      <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-12 sm:ml-4">
                  {doc.status === 'processing' && <Spinner size="sm" />}
                  {doc.status === 'extracted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {doc.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {doc.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                  <Badge className={DOCUMENT_STATUS_COLORS[doc.status]}>{doc.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}