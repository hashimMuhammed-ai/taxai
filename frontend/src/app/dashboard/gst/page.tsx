'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Receipt, FileText } from 'lucide-react';
import { useCalculateGst, useGstSummary, useDocuments } from '@/lib/hooks';
import { PageHeader, PageSpinner, EmptyState } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/utils';

const RATES = [0,0.25,1,1.5,3,5,7.5,12,18,28];
const STATES = [
  {code:'AP',name:'Andhra Pradesh'},{code:'DL',name:'Delhi'},{code:'GJ',name:'Gujarat'},
  {code:'KA',name:'Karnataka'},{code:'KL',name:'Kerala'},{code:'MH',name:'Maharashtra'},
  {code:'TN',name:'Tamil Nadu'},{code:'TG',name:'Telangana'},{code:'UP',name:'Uttar Pradesh'},
  {code:'WB',name:'West Bengal'},{code:'HR',name:'Haryana'},{code:'RJ',name:'Rajasthan'},
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const schema = z.object({
  invoiceNumber: z.string().min(1,'Required'), vendorName: z.string().min(1,'Required'),
  baseAmount: z.coerce.number().min(1), gstRate: z.coerce.number(),
  vendorState: z.string().length(2), buyerState: z.string().length(2),
  invoiceDate: z.string().min(1),
  vendorGstin: z.string().refine(val => !val || GSTIN_REGEX.test(val), { message: 'Invalid GSTIN format' }).optional(),
  buyerGstin: z.string().refine(val => !val || GSTIN_REGEX.test(val), { message: 'Invalid GSTIN format' }).optional(),
});
type F = z.infer<typeof schema>;

const GST_STATE_MAP: Record<string, string> = {
  '37': 'AP', '07': 'DL', '24': 'GJ', '29': 'KA', '32': 'KL',
  '27': 'MH', '33': 'TN', '36': 'TG', '09': 'UP', '19': 'WB',
  '06': 'HR', '08': 'RJ'
};

export default function GstPage() {
  const calc = useCalculateGst();
  const { data: summary, isLoading } = useGstSummary();
  const { data: documents } = useDocuments();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { gstRate:18, vendorState:'KL', buyerState:'KL', invoiceDate: new Date().toISOString().split('T')[0] },
  });
  const result = (calc.data?.data as any)?.data;

  const onSubmit = (d: F) => {
    const payload: any = { ...d };
    if (!payload.vendorGstin) delete payload.vendorGstin;
    if (!payload.buyerGstin) delete payload.buyerGstin;
    calc.mutate({ ...payload, sourceDocumentId: selectedInvoiceId || undefined });
  };

  // Filter for successfully extracted invoice documents
  const invoices = documents?.filter(
    (d: any) => d.type === 'invoice' && d.status === 'extracted'
  );

  const handleInvoiceSelect = (docId: string) => {
    setSelectedInvoiceId(docId);
    if (!docId) return;

    const doc = invoices?.find((d: any) => (d.id || d._id) === docId);
    if (doc && doc.extractedData) {
      const data = doc.extractedData as any;
      if (data.invoiceNumber) setValue('invoiceNumber', data.invoiceNumber);
      if (data.vendorName) setValue('vendorName', data.vendorName);
      if (data.invoiceAmount) setValue('baseAmount', data.invoiceAmount);
      if (data.invoiceDate) {
        const d = new Date(data.invoiceDate);
        if (!isNaN(d.getTime())) {
          setValue('invoiceDate', d.toISOString().split('T')[0]);
        }
      }
      if (data.gstin) {
        setValue('vendorGstin', data.gstin);
        const stateCode = data.gstin.substring(0, 2);
        const mappedState = GST_STATE_MAP[stateCode];
        if (mappedState) {
          setValue('vendorState', mappedState);
        }
      }
      if (data.buyerGstin) {
        setValue('buyerGstin', data.buyerGstin);
        const stateCode = data.buyerGstin.substring(0, 2);
        const mappedState = GST_STATE_MAP[stateCode];
        if (mappedState) {
          setValue('buyerState', mappedState);
        }
      }
      if (data.gstAmount && data.invoiceAmount) {
        const calculatedRate = Math.round((data.gstAmount / data.invoiceAmount) * 100);
        const closestRate = RATES.reduce((prev, curr) =>
          Math.abs(curr - calculatedRate) < Math.abs(prev - calculatedRate) ? curr : prev
        );
        setValue('gstRate', closestRate);
      }
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="GST Calculator" description="Calculate CGST/SGST (intra-state) or IGST (inter-state) automatically" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Invoice Details</h2>

          {invoices && invoices.length > 0 && (
            <div className="mb-4 bg-blue-50/50 border border-blue-100/50 rounded-lg p-3">
              <label className="block text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Load Extracted Data from Uploaded Invoices
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                className="input text-xs py-1.5 px-2 bg-white border border-blue-100 cursor-pointer"
              >
                <option value="">-- Choose Invoice --</option>
                {invoices.map((inv: any) => (
                  <option key={inv.id || inv._id} value={inv.id || inv._id}>
                    {inv.originalFilename} (Inv: {inv.extractedData?.invoiceNumber ?? 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div><label className="block text-xs text-gray-500 mb-1">Invoice Number</label><input {...register('invoiceNumber')} className="input text-sm" placeholder="INV-2024-001" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Vendor Name</label><input {...register('vendorName')} className="input text-sm" placeholder="ABC Pvt Ltd" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Base Amount (₹)</label><input {...register('baseAmount')} type="number" step="any" className="input text-sm" placeholder="10000" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">GST Rate (%)</label>
                <select {...register('gstRate')} className="input text-sm">{RATES.map(r => <option key={r} value={r}>{r}%</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Vendor State</label>
                <select {...register('vendorState')} className="input text-sm">{STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Buyer State</label>
                <select {...register('buyerState')} className="input text-sm">{STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vendor GSTIN (Optional)</label>
                <input {...register('vendorGstin')} className="input text-sm" placeholder="29AAAAA1111A1Z1" />
                {errors.vendorGstin && <p className="text-xs text-red-500 mt-1">{errors.vendorGstin.message}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Buyer GSTIN (Optional)</label>
                <input {...register('buyerGstin')} className="input text-sm" placeholder="29BBBBB2222B2Z2" />
                {errors.buyerGstin && <p className="text-xs text-red-500 mt-1">{errors.buyerGstin.message}</p>}
              </div>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Invoice Date</label><input {...register('invoiceDate')} type="date" className="input text-sm" /></div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={calc.isPending}>
              <Receipt className="w-4 h-4" />{calc.isPending ? 'Calculating…' : 'Calculate GST'}
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">GST Breakdown</h2>
          {result ? (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 text-center ${result.gstBreakdown.isInterState ? 'bg-purple-50' : 'bg-blue-50'}`}>
                <p className={`text-xs font-medium ${result.gstBreakdown.isInterState ? 'text-purple-700' : 'text-blue-700'}`}>
                  {result.gstBreakdown.isInterState ? 'Inter-state → IGST applies' : 'Intra-state → CGST + SGST apply'}
                </p>
              </div>
              {[
                { l:'Base Amount', v:result.gstBreakdown.baseAmount, bold:false },
                !result.gstBreakdown.isInterState && { l:`CGST (${result.gstRate/2}%)`, v:result.gstBreakdown.cgst, bold:false },
                !result.gstBreakdown.isInterState && { l:`SGST (${result.gstRate/2}%)`, v:result.gstBreakdown.sgst, bold:false },
                result.gstBreakdown.isInterState && { l:`IGST (${result.gstRate}%)`, v:result.gstBreakdown.igst, bold:false },
                { l:'Total GST', v:result.gstBreakdown.totalGst, bold:true },
                { l:'Invoice Total', v:result.gstBreakdown.totalAmount, bold:true },
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} className={`flex justify-between text-sm ${row.bold ? 'border-t border-gray-100 pt-2 font-bold' : ''}`}>
                  <span className={row.bold ? 'text-gray-900' : 'text-gray-500'}>{row.l}</span>
                  <span className={row.bold ? 'text-gray-900' : 'text-gray-700'}>{formatINR(row.v)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Receipt} title="Fill the form and calculate" description="GST breakdown will appear here" />}
        </div>
      </div>

      {summary && summary.records.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Invoice History ({summary.records.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { l:'Total Taxable', v:summary.summary.totalTaxableAmount },
              { l:'Total GST Paid', v:summary.summary.totalGstPaid },
              { l:'CGST Total', v:summary.summary.cgstTotal },
              { l:'IGST Total', v:summary.summary.igstTotal },
            ].map((s,i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{s.l}</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{formatINR(s.v)}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-gray-50">
            {summary.records.slice(0,10).map(rec => (
              <div key={rec.id} className="flex items-center justify-between py-3">
                <div><p className="text-sm font-medium text-gray-900">{rec.vendorName}</p><p className="text-xs text-gray-400">{rec.invoiceNumber} · {formatDate(rec.invoiceDate)}</p></div>
                <div className="text-right"><p className="text-sm font-semibold text-gray-900">{formatINR(rec.gstBreakdown.totalAmount)}</p><p className="text-xs text-gray-400">GST: {formatINR(rec.gstBreakdown.totalGst)}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}