import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatINR(amount: number | null | undefined, compact = false): string {
  if (amount == null) return '—';
  if (compact && amount >= 10_000_000) return `₹${(amount/10_000_000).toFixed(1)}Cr`;
  if (compact && amount >= 100_000) return `₹${(amount/100_000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const FILING_STATUS_LABELS: Record<string, string> = {
  draft:'Draft', ai_prepared:'AI Prepared', ca_review:'CA Review',
  user_approved:'Approved', ready_to_file:'Ready to File',
};
export const FILING_STATUS_COLORS: Record<string, string> = {
  draft:'bg-gray-100 text-gray-700', ai_prepared:'bg-blue-100 text-blue-700',
  ca_review:'bg-yellow-100 text-yellow-700', user_approved:'bg-green-100 text-green-700',
  ready_to_file:'bg-emerald-100 text-emerald-700',
};
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  form_16:'Form 16', salary_slip:'Salary Slip', bank_statement:'Bank Statement',
  investment_proof:'Investment Proof', form_26as:'Form 26AS', rent_receipt:'Rent Receipt',
  invoice:'Invoice', other:'Other',
};
export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  pending:'bg-gray-100 text-gray-600', processing:'bg-blue-100 text-blue-700',
  extracted:'bg-green-100 text-green-700', verified:'bg-emerald-100 text-emerald-700',
  failed:'bg-red-100 text-red-700',
};

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
export function timeAgo(date: string | Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}
export function readinessColor(score: number) { return score>=80?'text-green-600':score>=50?'text-yellow-600':'text-red-500'; }
export function readinessBg(score: number) { return score>=80?'bg-green-500':score>=50?'bg-yellow-500':'bg-red-500'; }