import { FilingEntity } from '../entities/filing.entity';
import { FilingStatus } from '@taxai/shared';

export const FILING_REPOSITORY = Symbol('IFilingRepository');

export interface IFilingRepository {
  findById(id: string, tenantId?: string): Promise<FilingEntity | null>;
  findByUserId(userId: string, tenantId: string): Promise<FilingEntity[]>;
  findByCaId(caId: string, tenantId?: string): Promise<FilingEntity[]>;
  findByStatus(status: FilingStatus, tenantId: string): Promise<FilingEntity[]>;
  save(filing: FilingEntity): Promise<FilingEntity>;
  update(filing: FilingEntity): Promise<FilingEntity>;
}