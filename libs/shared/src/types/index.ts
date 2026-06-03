export interface ApiResponse<T = null> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  error?: ApiError;
  correlationId?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>; // field-level validation errors
}


export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}


export enum UserRole {
  USER = 'user',
  CA = 'ca',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}


export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  tokenFamily: string; // Refresh token rotation tracking
}


export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  correlationId: string;
}