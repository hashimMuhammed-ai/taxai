import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IAuditLogRepository, AUDIT_LOG_REPOSITORY } from '../../domain/repositories/audit-log.repository.interface';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import { AuditAction } from '@taxai/shared';

export interface LogActionParams {
  userId: string;
  tenantId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async log(params: LogActionParams): Promise<void> {
    const entry = new AuditLogEntity({
      id: uuidv4(),
      ...params,
      occurredAt: new Date(),
    });
    // Fire and forget — never block a business operation for audit logging
    await this.auditRepo.append(entry).catch(() => {
      // Silently swallow audit errors — the primary operation already succeeded
      // In production: pipe to a dead-letter queue or external SIEM
    });
  }

  async getResourceHistory(resourceId: string, tenantId: string): Promise<AuditLogEntity[]> {
    return this.auditRepo.findByResource(resourceId, tenantId);
  }

  async getUserHistory(userId: string, tenantId: string, limit?: number): Promise<AuditLogEntity[]> {
    return this.auditRepo.findByUser(userId, tenantId, limit);
  }
}