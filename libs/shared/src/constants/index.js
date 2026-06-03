"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILING_STATUS = exports.API_ERRORS = exports.INJECTION_TOKENS = exports.JOBS = exports.QUEUES = void 0;
exports.QUEUES = {
    DOCUMENT_PROCESSING: 'document-processing',
    NOTIFICATIONS: 'notifications',
    FILING_REMINDERS: 'filing-reminders',
    REPORT_GENERATION: 'report-generation',
};
exports.JOBS = {
    DOCUMENT_PROCESSING: {
        PROCESS_DOCUMENT: 'process-uploaded-document',
        EXTRACT_INVOICE: 'extract-invoice',
    },
    NOTIFICATIONS: {
        SEND_EMAIL: 'send-email',
        WELCOME_EMAIL: 'welcome-email',
        FILING_APPROVED: 'filing-approved',
    },
    FILING_REMINDERS: {
        ITR_DEADLINE: 'itr-deadline-reminder',
        ADVANCE_TAX: 'advance-tax-reminder',
        GST_RETURN: 'gst-return-reminder',
    },
    REPORT_GENERATION: {
        TAX_SUMMARY_PDF: 'tax-summary-pdf',
        GST_SUMMARY_PDF: 'gst-summary-pdf',
    },
};
exports.INJECTION_TOKENS = {
    USER_REPOSITORY: 'IUserRepository',
    STORAGE_SERVICE: 'IStorageService',
    LOGGER: 'LOGGER',
};
exports.API_ERRORS = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
};
exports.FILING_STATUS = {
    DRAFT: 'draft',
    AI_PREPARED: 'ai_prepared',
    CA_REVIEW: 'ca_review',
    USER_APPROVED: 'user_approved',
    READY_TO_FILE: 'ready_to_file',
};
//# sourceMappingURL=index.js.map