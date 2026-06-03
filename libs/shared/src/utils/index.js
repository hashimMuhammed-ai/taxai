"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.buildPaginationMeta = buildPaginationMeta;
exports.normalizePagination = normalizePagination;
exports.encryptPII = encryptPII;
exports.decryptPII = decryptPII;
function successResponse(data, message, meta, correlationId) {
    return {
        success: true,
        data,
        message,
        meta,
        correlationId,
        timestamp: new Date().toISOString(),
    };
}
function errorResponse(code, message, details, correlationId) {
    return {
        success: false,
        data: null,
        error: { code, message, details },
        correlationId,
        timestamp: new Date().toISOString(),
    };
}
function buildPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}
function normalizePagination(query) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
function encryptPII(plaintext, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
function decryptPII(ciphertext, keyHex) {
    const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
}
//# sourceMappingURL=index.js.map