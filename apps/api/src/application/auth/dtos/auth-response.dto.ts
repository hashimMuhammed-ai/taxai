import { UserRole } from '@taxai/shared';

export class AuthTokensDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // seconds
  tokenType = 'Bearer' as const;
}

export class UserProfileDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  fullName!: string;
  role!: UserRole;
  tenantId!: string;
  phone?: string;
  lastLoginAt?: Date;
  createdAt!: Date;
}

export class AuthResponseDto {
  user!: UserProfileDto;
  tokens!: AuthTokensDto;
}