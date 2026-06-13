// ─── API Envelope ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: { code: string; message: string; details?: Record<string, string[]> };
  correlationId?: string;
  timestamp: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'user' | 'ca' | 'admin';
  tenantId: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt: string;
  workspaceName?: string;
  inviteCode?: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type DocumentType =
  | 'form_16' | 'salary_slip' | 'bank_statement'
  | 'investment_proof' | 'form_26as' | 'rent_receipt'
  | 'invoice' | 'other';

export type DocumentStatus = 'pending' | 'processing' | 'extracted' | 'verified' | 'failed';

export interface TaxDocument {
  id: string;
  type: DocumentType;
  originalFilename: string;
  status: DocumentStatus;
  mimeType: string;
  sizeBytes: number;
  extractedData?: Record<string, unknown>;
  extractionError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadInitiateResponse {
  documentId: string;
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

// ─── Tax ─────────────────────────────────────────────────────────────────────
export interface TaxSlabBreakdown {
  from: number;
  to: number | null;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  assessmentYear: string;
  regime: 'old' | 'new';
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  slabBreakdown: TaxSlabBreakdown[];
  taxBeforeCess: number;
  surcharge: number;
  cess: number;
  section87ARebate: number;
  taxAfterRebate: number;
  totalTax: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface DeductionSuggestion {
  section: string;
  description: string;
  currentAmount: number;
  maxAllowed: number;
  potentialSaving: number;
  actionRequired: string;
  confidence: number;
}

export interface TaxRecord {
  id: string;
  assessmentYear: string;
  oldRegimeResult: TaxCalculationResult;
  newRegimeResult: TaxCalculationResult;
  recommendedRegime: 'old' | 'new';
  taxSavingBySwitch: number;
  deductionSuggestions: DeductionSuggestion[];
  filingReadinessScore: number;
  missingDocuments: string[];
  sourceDocumentIds?: string[];
  createdAt: string;
}

// ─── GST ─────────────────────────────────────────────────────────────────────
export interface GstBreakdown {
  baseAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  utgst: number;
  totalGst: number;
  totalAmount: number;
  isInterState: boolean;
}

export interface GstRecord {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorGstin?: string;
  invoiceDate: string;
  invoiceAmount: number;
  gstRate: number;
  gstBreakdown: GstBreakdown;
  vendorState: string;
  buyerState: string;
  sourceDocumentId?: string;
  createdAt: string;
}

// ─── Filing ───────────────────────────────────────────────────────────────────
export type FilingStatus =
  | 'draft' | 'ai_prepared' | 'ca_review'
  | 'user_approved' | 'ready_to_file';

export interface FilingNote {
  authorId: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface Filing {
  id: string;
  assessmentYear: string;
  taxRecordId: string;
  selectedRegime: 'old' | 'new';
  status: FilingStatus;
  assignedCaId?: string;
  notes: FilingNote[];
  rejectionReason?: string;
  approvedAt?: string;
  reportObjectKey?: string;
  userId: string;
  client?: {
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  filingReadiness: {
    score: number;
    status: 'not_started' | 'in_progress' | 'ready' | 'filed';
    missingDocuments: string[];
    assessmentYear: string;
  };
  taxSummary: {
    hasCalculation: boolean;
    recommendedRegime: string | null;
    totalTax: number | null;
    taxSavingBySwitch: number | null;
    effectiveTaxRate: number | null;
    totalPotentialSaving: number | null;
  } | null;
  documents: {
    total: number;
    pending: number;
    processing: number;
    extracted: number;
    failed: number;
    recentUploads: Array<{ id: string; type: string; filename: string; status: string; uploadedAt: string }>;
  };
  deductionOpportunities: Array<{
    section: string;
    description: string;
    potentialSaving: number;
    actionRequired: string;
  }>;
  activeFiling: {
    id: string;
    status: FilingStatus;
    assessmentYear: string;
    assignedCaId: string | null;
    lastUpdated: string;
  } | null;
  unreadNotifications: number;
}


// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}