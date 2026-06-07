import { GstRecordEntity } from '../entities/gst-record.entity';

export const GST_RECORD_REPOSITORY = Symbol('IGstRecordRepository');

export interface IGstRecordRepository {
  findById(id: string, tenantId: string): Promise<GstRecordEntity | null>;
  findByUserId(userId: string, tenantId: string): Promise<GstRecordEntity[]>;
  save(record: GstRecordEntity): Promise<GstRecordEntity>;
  getTotalGstByUser(userId: string, tenantId: string): Promise<{ totalTaxable: number; totalGst: number }>;
}