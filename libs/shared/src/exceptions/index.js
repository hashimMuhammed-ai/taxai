"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantViolationException = exports.ForbiddenOperationException = exports.ResourceAlreadyExistsException = exports.ResourceNotFoundException = exports.AccountSuspendedException = exports.InvalidTokenException = exports.TokenExpiredException = exports.InvalidCredentialsException = exports.DomainException = void 0;
class DomainException extends Error {
    constructor(message, code, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.DomainException = DomainException;
class InvalidCredentialsException extends DomainException {
    constructor() {
        super('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }
}
exports.InvalidCredentialsException = InvalidCredentialsException;
class TokenExpiredException extends DomainException {
    constructor() {
        super('Token has expired', 'TOKEN_EXPIRED', 401);
    }
}
exports.TokenExpiredException = TokenExpiredException;
class InvalidTokenException extends DomainException {
    constructor() {
        super('Invalid token', 'INVALID_TOKEN', 401);
    }
}
exports.InvalidTokenException = InvalidTokenException;
class AccountSuspendedException extends DomainException {
    constructor() {
        super('Account is suspended. Contact support.', 'ACCOUNT_SUSPENDED', 403);
    }
}
exports.AccountSuspendedException = AccountSuspendedException;
class ResourceNotFoundException extends DomainException {
    constructor(resource, id) {
        super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 'RESOURCE_NOT_FOUND', 404);
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class ResourceAlreadyExistsException extends DomainException {
    constructor(resource, field, value) {
        super(`${resource} with ${field} '${value}' already exists`, 'RESOURCE_CONFLICT', 409);
    }
}
exports.ResourceAlreadyExistsException = ResourceAlreadyExistsException;
class ForbiddenOperationException extends DomainException {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 'FORBIDDEN', 403);
    }
}
exports.ForbiddenOperationException = ForbiddenOperationException;
class TenantViolationException extends DomainException {
    constructor() {
        super('Cross-tenant operation denied', 'TENANT_VIOLATION', 403);
    }
}
exports.TenantViolationException = TenantViolationException;
//# sourceMappingURL=index.js.map