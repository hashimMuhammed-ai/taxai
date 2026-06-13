export interface AdminStatsResponse {
  users: {
    total: number;
    recentRegistrations: any[];
  };
  documents: {
    total: number;
    pending: number;
    processing: number;
    extracted: number;
    failed: number;
  };
  taxCalculations: {
    total: number;
  };
  filings: {
    total: number;
    byStatus: {
      draft: number;
      aiPrepared: number;
      caReview: number;
      userApproved: number;
      readyToFile: number;
    };
  };
}