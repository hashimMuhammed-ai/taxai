import { TaxRecordEntity } from '../entities/tax-record.entity';

export const TAX_RECORD_REPOSITORY = Symbol('ITaxRecordRepository');

export interface ITaxRecordRepository {
  findById(id: string, tenantId: string): Promise<TaxRecordEntity | null>;
  findByUserId(userId: string, tenantId: string, assessmentYear?: string): Promise<TaxRecordEntity[]>;
  findLatestByUser(userId: string, tenantId: string): Promise<TaxRecordEntity | null>;
  save(record: TaxRecordEntity): Promise<TaxRecordEntity>;
}