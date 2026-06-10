import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  // ─── App ─────────────────────────────────────────────────────────────────
  get nodeEnv(): string { return this.config.get('NODE_ENV', 'development'); }
  get isProduction(): boolean { return this.nodeEnv === 'production'; }
  get isDevelopment(): boolean { return this.nodeEnv === 'development'; }
  get port(): number { return this.config.get('PORT', 3000); }
  get apiPrefix(): string { return this.config.get('API_PREFIX', 'api/v1'); }
  get corsOrigins(): string[] {
    return this.config.get<string>('CORS_ORIGINS', '').split(',').map(s => s.trim());
  }

  // ─── MongoDB ──────────────────────────────────────────────────────────────
  get mongoUri(): string { return this.config.getOrThrow('MONGO_URI'); }

  // ─── JWT ─────────────────────────────────────────────────────────────────
  get jwtAccessSecret(): string { return this.config.getOrThrow('JWT_ACCESS_SECRET'); }
  get jwtRefreshSecret(): string { return this.config.getOrThrow('JWT_REFRESH_SECRET'); }
  get jwtAccessExpiresIn(): string { return this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'); }
  get jwtRefreshExpiresIn(): string { return this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'); }

  // ─── Redis ────────────────────────────────────────────────────────────────
  get redisHost(): string { return this.config.get('REDIS_HOST', 'localhost'); }
  get redisPort(): number { return this.config.get('REDIS_PORT', 6379); }
  get redisPassword(): string | undefined {
    const pw = this.config.get<string>('REDIS_PASSWORD');
    return pw || undefined;
  }

  // ─── Cloudflare R2 ────────────────────────────────────────────────────────
  get r2AccountId(): string { return this.config.getOrThrow('CF_ACCOUNT_ID'); }
  get r2AccessKey(): string { return this.config.getOrThrow('CF_R2_ACCESS_KEY'); }
  get r2SecretKey(): string { return this.config.getOrThrow('CF_R2_SECRET_KEY'); }
  get r2Bucket(): string { return this.config.getOrThrow('CF_R2_BUCKET'); }
  get r2PublicUrl(): string { return this.config.getOrThrow('CF_R2_PUBLIC_URL'); }
  get r2Endpoint(): string {
    return `https://${this.r2AccountId}.r2.cloudflarestorage.com`;
  }

  // ─── PII Encryption ───────────────────────────────────────────────────────
  get encryptionKey(): string { return this.config.getOrThrow('ENCRYPTION_KEY'); }

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  get throttleTtl(): number { return this.config.get('THROTTLE_TTL', 60000); }
  get throttleLimit(): number { return this.config.get('THROTTLE_LIMIT', 100); }
  get authThrottleLimit(): number { return this.config.get('AUTH_THROTTLE_LIMIT', 5); }

  get openaiApiKey(): string { return this.config.getOrThrow('openaiApiKey')}

  get resendApiKey(): string { return this.config.getOrThrow('RESEND_API_KEY'); }
}