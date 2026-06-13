// Queue Names 
export const QUEUES = {
  DOCUMENT_PROCESSING: 'document-processing',
  REPORT_GENERATION: 'report-generation',
} as const;

// Job Names 
export const JOBS = {
  DOCUMENT_PROCESSING: {
    PROCESS_DOCUMENT: 'process-uploaded-document',
    EXTRACT_INVOICE: 'extract-invoice',
  },

  REPORT_GENERATION: {
    TAX_SUMMARY_PDF: 'tax-summary-pdf',
    GST_SUMMARY_PDF: 'gst-summary-pdf',
  },
} as const;

// DI Injection Tokens 
export const INJECTION_TOKENS = {
  USER_REPOSITORY: 'IUserRepository',
  STORAGE_SERVICE: 'IStorageService',
  LOGGER: 'LOGGER',
} as const;


export const API_ERRORS = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;


export const FILING_STATUS = {
  DRAFT: 'draft',
  AI_PREPARED: 'ai_prepared',
  CA_REVIEW: 'ca_review',
  USER_APPROVED: 'user_approved',
  READY_TO_FILE: 'ready_to_file',
} as const;

export type FilingStatus =
  typeof FILING_STATUS[keyof typeof FILING_STATUS];

export const DOCUMENT_TYPE = {
  FORM_16: 'form_16',
  SALARY_SLIP: 'salary_slip',
  BANK_STATEMENT: 'bank_statement',
  INVESTMENT_PROOF: 'investment_proof',
  FORM_26AS: 'form_26as',
  RENT_RECEIPT: 'rent_receipt',
  INVOICE: 'invoice',
  OTHER: 'other',
} as const;
 
export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];
 

export const DOCUMENT_STATUS = {
  PENDING: 'pending',         // Uploaded, awaiting OCR
  PROCESSING: 'processing',   // OCR + AI extraction running
  EXTRACTED: 'extracted',     // Data extracted, needs review
  VERIFIED: 'verified',       // User confirmed extracted data
  FAILED: 'failed',           // Extraction failed
} as const;
 
export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];
 

export const TAX_REGIME = {
  OLD: 'old',
  NEW: 'new',
} as const;
 
export type TaxRegime = typeof TAX_REGIME[keyof typeof TAX_REGIME];
 

export const GST_TYPE = {
  CGST: 'cgst',
  SGST: 'sgst',
  IGST: 'igst',
  UTGST: 'utgst',
} as const;
 
export type GstType = typeof GST_TYPE[keyof typeof GST_TYPE];
 
// ─── Indian States (for CGST/SGST vs IGST routing) ────────────────────────────
export const INDIAN_STATES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  DN: 'Dadra and Nagar Haveli',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu and Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};
 

export const CA_CASE_STATUS = {
  ASSIGNED: 'assigned',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_INFO: 'needs_info',
} as const;

export type CaCaseStatus =
  typeof CA_CASE_STATUS[keyof typeof CA_CASE_STATUS];


  export const AUDIT_ACTION = {
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DELETED: 'document.deleted',
  TAX_CALCULATED: 'tax.calculated',
  GST_CALCULATED: 'gst.calculated',
  FILING_CREATED: 'filing.created',
  FILING_STATUS_CHANGED: 'filing.status_changed',
  CA_ASSIGNED: 'ca.assigned',
  CA_APPROVED: 'ca.approved',
  CA_REJECTED: 'ca.rejected',
  REPORT_GENERATED: 'report.generated',
} as const;

export type AuditAction =
  typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

