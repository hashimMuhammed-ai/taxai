import { BaseEntity } from './base.entity';
import { UserRole, UserStatus } from '@taxai/shared';
import {
  AccountSuspendedException
} from '@taxai/shared';

export { UserRole, UserStatus };

export interface CreateUserProps {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
  status?: UserStatus;
  lastLoginAt?: Date;
  refreshTokenHash?: string | null;
}

export class UserEntity extends BaseEntity {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly phone?: string;
  readonly lastLoginAt?: Date;
  readonly refreshTokenHash?: string | null;

  private constructor(props: CreateUserProps) {
    super({
      id: props.id,
      tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.email = props.email.toLowerCase().trim();
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.role = props.role;
    this.status = props.status ?? UserStatus.ACTIVE;
    this.phone = props.phone;
    this.lastLoginAt = props.lastLoginAt;
    this.refreshTokenHash = props.refreshTokenHash;
  }

  // ─── Factory ───────────────────────────────────────────────────────────────
  static create(props: CreateUserProps): UserEntity {
    return new UserEntity(props);
  }

  // ─── Computed properties ───────────────────────────────────────────────────
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // ─── Domain guards ─────────────────────────────────────────────────────────
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  canLogin(): void {
    if (this.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }
  }

  isCA(): boolean {
    return this.role === UserRole.CA;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  // ─── Immutable state transitions ───────────────────────────────────────────
  // Returns a NEW entity — original is never mutated (immutable domain model)

  withRefreshToken(hash: string): UserEntity {
    return new UserEntity({ ...this.toProps(), refreshTokenHash: hash, updatedAt: new Date() });
  }

  withoutRefreshToken(): UserEntity {
    return new UserEntity({ ...this.toProps(), refreshTokenHash: null, updatedAt: new Date() });
  }

  withLastLogin(): UserEntity {
    return new UserEntity({ ...this.toProps(), lastLoginAt: new Date(), updatedAt: new Date() });
  }

  private toProps(): CreateUserProps {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email,
      passwordHash: this.passwordHash,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      status: this.status,
      phone: this.phone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      refreshTokenHash: this.refreshTokenHash,
    };
  }
}