import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().required(),

  // MongoDB
  MONGO_URI: Joi.string().required().messages({
    'any.required': '❌  MONGO_URI is required',
  }),

  // JWT — enforce minimum length so weak secrets can never reach production
  JWT_ACCESS_SECRET: Joi.string().min(32).required().messages({
    'string.min': '❌  JWT_ACCESS_SECRET must be at least 32 characters',
    'any.required': '❌  JWT_ACCESS_SECRET is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': '❌  JWT_REFRESH_SECRET must be at least 32 characters',
    'any.required': '❌  JWT_REFRESH_SECRET is required',
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Cloudflare R2
  CF_ACCOUNT_ID: Joi.string().required().messages({
    'any.required': '❌  CF_ACCOUNT_ID is required (Cloudflare R2)',
  }),
  CF_R2_ACCESS_KEY: Joi.string().required(),
  CF_R2_SECRET_KEY: Joi.string().required(),
  CF_R2_BUCKET: Joi.string().required(),
  CF_R2_PUBLIC_URL: Joi.string().uri().required(),

  // PII Encryption — must be 64 hex chars = 32 bytes
  ENCRYPTION_KEY: Joi.string().length(64).required().messages({
    'string.length': '❌  ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Run: openssl rand -hex 32',
    'any.required': '❌  ENCRYPTION_KEY is required for PII encryption',
  }),

  // OpenAI (used by worker for AI extraction)
  OPENAI_API_KEY: Joi.string().required().messages({
    'any.required': '❌  OPENAI_API_KEY is required for AI document extraction',
  }),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  AUTH_THROTTLE_LIMIT: Joi.number().default(5),
});