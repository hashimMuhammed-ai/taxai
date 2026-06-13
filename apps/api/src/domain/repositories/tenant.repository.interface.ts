import { TenantEntity } from '../entities/tenant.entity';

export const TENANT_REPOSITORY = Symbol('ITenantRepository');

export interface ITenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findByInviteCode(inviteCode: string): Promise<TenantEntity | null>;
  save(tenant: TenantEntity): Promise<TenantEntity>;
}
