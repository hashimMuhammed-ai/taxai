// Base Domain Exception 
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}


export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }
}

export class TokenExpiredException extends DomainException {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', 401);
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('Invalid token', 'INVALID_TOKEN', 401);
  }
}

export class AccountSuspendedException extends DomainException {
  constructor() {
    super('Account is suspended. Contact support.', 'ACCOUNT_SUSPENDED', 403);
  }
}


export class ResourceNotFoundException extends DomainException {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      'RESOURCE_NOT_FOUND',
      404,
    );
  }
}

export class ResourceAlreadyExistsException extends DomainException {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      'RESOURCE_CONFLICT',
      409,
    );
  }
}

// Authorization Exceptions 
export class ForbiddenOperationException extends DomainException {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN', 403);
  }
}


export class TenantViolationException extends DomainException {
  constructor() {
    super('Cross-tenant operation denied', 'TENANT_VIOLATION', 403);
  }
}