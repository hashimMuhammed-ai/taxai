import { AuditLogEntity, AuditLogProps } from '../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('IAuditLogRepository');

export interface IAuditLogRepository {
  append(log: AuditLogEntity): Promise<void>;
  findByResource(resourceId: string, tenantId: string): Promise<AuditLogEntity[]>;
  findByUser(userId: string, tenantId: string, limit?: number): Promise<AuditLogEntity[]>;
}