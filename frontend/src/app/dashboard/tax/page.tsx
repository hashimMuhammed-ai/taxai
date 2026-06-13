'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';
import { useCalculateTax, useDocuments, useTaxEstimate } from '@/lib/hooks';
import { PageHeader, PageSpinner, Badge, ProgressBar } from '@/components/ui';
import { formatINR } from '@/lib/utils';
import type { TaxRecord } from '@/lib/types';

const schema = z.object({
  assessmentYear: z.string().default('2024-25'),
  grossSalary: z.coerce.number().min(0),
  otherIncome: z.coerce.number().min(0).default(0),
  regime: z.enum(['old','new']).default('new'),
  section80C: z.coerce.number().min(0).max(150000).default(0),
  section80D: z.coerce.number().min(0).max(50000).default(0),
  section80CCD1B: z.coerce.number().min(0).max(50000).default(0),
  homeLoanInterest: z.coerce.number().min(0).max(200000).default(0),
  hra: z.coerce.number().min(0).default(0),
});
type F = z.infer<typeof schema>;

function RegimeCard({ result, recommended, label }: { result: TaxRecord['oldRegimeResult']; recommended: boolean; label: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`card p-5 ${recommended ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {recommended && <Badge className="bg-brand-100 text-brand-700">Recommended</Badge>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Gross Income</span><span className="font-medium">{formatINR(result.grossIncome)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Deductions</span><span className="font-medium text-green-600">-{formatINR(result.totalDeductions)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Taxable Income</span><span className="font-medium">{formatINR(result.taxableIncome)}</span></div>
        <div className="border-t border-gray-100 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-gray-700">Total Tax</span>
          <span className="font-bold text-lg text-gray-900">{formatINR(result.totalTax)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400"><span>Effective rate</span><span>{result.effectiveTaxRate}%</span></div>
      </div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-brand-600 mt-3 hover:text-brand-700">
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide' : 'Show'} slab breakdown
      </button>
      {expanded && (
        <div className="mt-3 space-y-1">
          {result.slabBreakdown.filter(s => s.taxableAmount > 0).map((slab, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
              <span>{formatINR(slab.from)} – {slab.to ? formatINR(slab.to) : '∞'} @ {slab.rate}%</span>
              <span className="font-medium">{formatINR(slab.taxAmount)}</span>
            </div>
          ))}
          {result.surcharge > 0 && <div className="flex justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded"><span>Surcharge</span><span>{formatINR(result.surcharge)}</span></div>}
          <div className="flex justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded"><span>Cess (4%)</span><span>{formatINR(result.cess)}</span></div>
          {result.section87ARebate > 0 && <div className="flex justify-between text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded"><span>87A Rebate</span><span>-{formatINR(result.section87ARebate)}</span></div>}
        </div>
      )}
    </div>
  );
}

export default function TaxPage() {
  const calculate = useCalculateTax();
  const { data: estimate, isLoading } = useTaxEstimate();
  const { data: documents } = useDocuments();
  const { register, handleSubmit, reset } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { assessmentYear:'2024-25', regime:'new' } });

  const useExtractedData = () => {
    if (!documents?.length) return;

    const form16 = documents.find((doc) => doc.type === 'form_16' && doc.status === 'extracted');
    const salarySlip = documents.find((doc) => doc.type === 'salary_slip' && doc.status === 'extracted');
    const investmentProof = documents.find((doc) => doc.type === 'investment_proof' && doc.status === 'extracted');

    // ── Form 16 is primary source (contains all employer salary details) ───────
    const form16Data = form16?.extractedData ?? {};
    
    // ── Fallback to salary_slip if Form 16 lacks salary details ─────────────
    const grossSalary = Number(form16Data.grossSalary) || Number(salarySlip?.extractedData?.grossSalary) || 0;
    const otherIncome = Number(form16Data.otherIncome) || 0;
    const hra = Number(form16Data.hra) || 0;
    
    // ── Form 16 contains deductions; supplement from investment_proof if needed ──
    const section80C = Number(form16Data.section80C) || Number(investmentProof?.extractedData?.section80C) || 0;
    const section80D = Number(form16Data.section80D) || Number(investmentProof?.extractedData?.section80D) || 0;
    const npsContribution = Number(form16Data.npsContribution) || Number(investmentProof?.extractedData?.npsContribution) || 0;
    const homeLoanInterest = Number(form16Data.homeLoanInterest) || Number(investmentProof?.extractedData?.homeLoanInterest) || 0;

    const extracted = {
      grossSalary,
      otherIncome,
      section80C,
      section80D,
      section80CCD1B: npsContribution,
      homeLoanInterest,
      hra,
      regime: 'new' as const,
      assessmentYear: '2024-25'
    };

    reset(extracted);
  };

  const onSubmit = (d: F) => calculate.mutate({
    assessmentYear: d.assessmentYear,
    grossSalary: d.grossSalary,
    otherIncome: d.otherIncome,
    regime: d.regime,
    deductions: {
      section80C: d.section80C,
      section80D: d.section80D,
      section80CCD1B: d.section80CCD1B,
      homeLoanInterest: d.homeLoanInterest,
      hra: d.hra,
    },
    sourceDocumentIds: documents?.filter((doc) => doc.status === 'extracted').map((doc) => doc.id),
  });

  if (isLoading) return <PageSpinner />;
  const record = (calculate.data?.data as any)?.data ?? estimate;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Tax Calculator" description="Compare old and new regime taxes instantly" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Gross Salary (₹)</label><input {...register('grossSalary')} type="number" className="input text-sm" placeholder="1200000" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Other Income (₹)</label><input {...register('otherIncome')} type="number" className="input text-sm" placeholder="0" /></div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deductions (Old Regime)</p>
              {[
                { f:'section80C' as const, l:'80C (max ₹1.5L)', p:'150000' },
                { f:'section80D' as const, l:'80D Health Insurance', p:'25000' },
                { f:'section80CCD1B' as const, l:'NPS 80CCD(1B)', p:'50000' },
                { f:'homeLoanInterest' as const, l:'Home Loan Interest', p:'200000' },
                { f:'hra' as const, l:'HRA', p:'0' },
              ].map(({ f, l, p }) => (
                <div key={f} className="mb-3"><label className="block text-xs text-gray-500 mb-1">{l}</label><input {...register(f)} type="number" className="input text-sm" placeholder={p} /></div>
              ))}
            </div>
            <button type="button" onClick={useExtractedData} className="btn-secondary w-full justify-center mb-3">
              Use extracted document data
            </button>
            <button type="submit" className="btn-primary w-full justify-center" disabled={calculate.isPending}>
              <Calculator className="w-4 h-4" />{calculate.isPending ? 'Calculating…' : 'Calculate Tax'}
            </button>
          </form>
        </div>
        <div className="lg:col-span-3 space-y-4">
          {record ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <RegimeCard key="old" result={record.oldRegimeResult} recommended={record.recommendedRegime === 'old'} label="Old Regime" />
                <RegimeCard key="new" result={record.newRegimeResult} recommended={record.recommendedRegime === 'new'} label="New Regime" />
              </div>
              {record.taxSavingBySwitch > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 font-medium">Choose the <strong>{record.recommendedRegime}</strong> regime to save <strong>{formatINR(record.taxSavingBySwitch)}</strong></p>
                </div>
              )}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-700">Filing Readiness</span><span className="text-sm font-bold">{record.filingReadinessScore}/100</span></div>
                <ProgressBar value={record.filingReadinessScore} />
              </div>
              {record.deductionSuggestions.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Optimise Your Deductions</h3>
                  <div className="space-y-3">
                    {record.deductionSuggestions.map((s: any, i: number) => (
                      <div key={i} className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><p className="text-xs font-medium text-gray-800">Section {s.section}</p><p className="text-xs text-gray-500 mt-0.5">{s.actionRequired}</p></div>
                        <span className="text-xs font-bold text-green-700 whitespace-nowrap">Save {formatINR(s.potentialSaving)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-10 flex flex-col items-center justify-center text-center">
              <Calculator className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Fill in your income details and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}