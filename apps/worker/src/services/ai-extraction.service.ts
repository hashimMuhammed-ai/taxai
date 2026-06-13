import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../api/src/infrastructure/config/app-config.service';
import { ExtractedDocumentData } from '../../../api/src/domain/entities/document.entity';

// Field extraction schemas per document type
const EXTRACTION_SCHEMAS: Record<string, { fields: string[]; prompt: string }> = {
  form_16: {
    fields: ['pan', 'employerName', 'employerTan', 'grossSalary', 'tdsDeducted', 'standardDeduction', 'professionalTax', 'assessmentYear', 'section80C', 'section80D', 'npsContribution', 'hra', 'homeLoanInterest'],
    prompt: `You are a tax document parser for Indian Form 16 (salary TDS certificate).
Extract ONLY the following fields from the document text. Return ONLY valid JSON, no markdown, no explanation.
Required JSON shape:
{
  "pan": string | null,
  "employerName": string | null,
  "employerTan": string | null,
  "grossSalary": number | null,
  "tdsDeducted": number | null,
  "standardDeduction": number | null,
  "professionalTax": number | null,
  "assessmentYear": string | null,
  "section80C": number | null,
  "section80D": number | null,
  "npsContribution": number | null,
  "hra": number | null,
  "homeLoanInterest": number | null,
  "confidence": {
    "pan": 0-1,
    "employerName": 0-1,
    "grossSalary": 0-1,
    "tdsDeducted": 0-1,
    "assessmentYear": 0-1
  }
}
Rules:
- All monetary values must be numbers (no commas, no ₹ symbol)
- PAN must match format: AAAAA9999A
- assessmentYear format: "YYYY-YY" e.g. "2024-25"
- If a field cannot be found, use null
- Confidence: 1.0 = certain, 0.0 = not found`,
  },

  salary_slip: {
    fields: ['employerName', 'grossSalary', 'tdsDeducted', 'professionalTax'],
    prompt: `You are a payroll document parser for Indian salary slips.
Extract fields and return ONLY valid JSON:
{
  "employerName": string | null,
  "grossSalary": number | null,
  "tdsDeducted": number | null,
  "professionalTax": number | null,
  "confidence": { "employerName": 0-1, "grossSalary": 0-1, "tdsDeducted": 0-1 }
}`,
  },

  invoice: {
    fields: ['invoiceNumber', 'gstin', 'vendorName', 'invoiceAmount', 'gstAmount', 'invoiceDate', 'buyerGstin'],
    prompt: `You are a GST invoice parser for Indian invoices.
Extract fields and return ONLY valid raw JSON, with no markdown code blocks and no explanations:
{
  "invoiceNumber": string | null,
  "gstin": string | null,
  "vendorName": string | null,
  "invoiceAmount": number | null,
  "gstAmount": number | null,
  "invoiceDate": string | null,
  "buyerGstin": string | null,
  "confidence": {
    "invoiceNumber": 0.0-1.0,
    "gstin": 0.0-1.0,
    "vendorName": 0.0-1.0,
    "invoiceAmount": 0.0-1.0,
    "gstAmount": 0.0-1.0,
    "invoiceDate": 0.0-1.0,
    "buyerGstin": 0.0-1.0
  }
}
Rules:
- gstin: This is the GSTIN of the seller (vendor/supplier) issuing the invoice. Format: 15-character Indian GSTIN.
- buyerGstin: This is the GSTIN of the recipient (buyer/client). Format: 15-character Indian GSTIN.
- invoiceAmount: This is the net taxable value or base amount BEFORE taxes/GST are added. Do NOT extract the grand total or gross amount.
- gstAmount: This is the total GST tax amount (CGST + SGST or IGST).
- invoiceDate format: "YYYY-MM-DD"
- All monetary values must be numbers (no commas, no ₹ symbols)
- If a field is not found in the document, use null
- Confidence: 1.0 = certain, 0.0 = not found or uncertain`,
  },
};

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private readonly groqApiKey: string;

  constructor(private readonly config: AppConfigService) {
    this.groqApiKey = config.groqApiKey;
  }

  async extract(rawText: string, documentType: string): Promise<ExtractedDocumentData> {
    const schema = EXTRACTION_SCHEMAS[documentType];

    if (!schema) {
      this.logger.warn(`No extraction schema for document type: ${documentType}. Returning raw text only.`);
      return { rawText, confidence: {} };
    }

    // Truncate text to avoid token limits — first 6000 chars covers most tax docs
    const truncatedText = rawText.substring(0, 6000);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          temperature: 0,             // Zero temperature = deterministic extraction
          max_tokens: 1000,
          response_format: { type: 'json_object' }, // Force JSON output
          messages: [
            { role: 'system', content: schema.prompt },
            {
              role: 'user',
              content: `Extract fields from this ${documentType.replace('_', ' ')} document:\n\n${truncatedText}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Validate confidence scores are in range
      if (parsed.confidence) {
        for (const key of Object.keys(parsed.confidence)) {
          const val = parsed.confidence[key];
          parsed.confidence[key] = Math.max(0, Math.min(1, Number(val) || 0));
        }
      }

      return { ...parsed, rawText };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI extraction failed for ${documentType}: ${message}`);

      // Graceful fallback — return raw text with zero confidence
      // Worker will still succeed, document flagged as low-confidence
      return {
        rawText,
        confidence: schema.fields.reduce((acc, f) => ({ ...acc, [f]: 0 }), {}),
      };
    }
  }
}