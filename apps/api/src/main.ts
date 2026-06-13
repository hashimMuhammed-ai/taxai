import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER, WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './infrastructure/config/app-config.service';
import { GlobalExceptionFilter } from './presentation/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './presentation/interceptors/http-logging.interceptor';
import { ResponseTransformInterceptor } from './presentation/interceptors/response-transform.interceptor';
import { RolesGuard } from './presentation/guards/guards';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until Winston is ready
  });

  const config = app.get(AppConfigService);

  const nestLogger = app.get(WINSTON_MODULE_NEST_PROVIDER); 
  const winstonLogger = app.get(WINSTON_MODULE_PROVIDER);

  const reflector = app.get(Reflector);
  
  // ── Logger ────────────────────────────────────────────────────────────────
  app.useLogger(nestLogger);

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: config.isProduction,
    crossOriginEmbedderPolicy: config.isProduction,
  }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // ── Global API prefix ─────────────────────────────────────────────────────
  app.setGlobalPrefix(config.apiPrefix, {
    exclude: ['health/live', 'health/ready'], // Health checks at root
  });

  // ── Global validation pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown properties silently
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,          // Auto-transform to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );


  // ── Global filters ────────────────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter(nestLogger));

  // ── Global interceptors ───────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(winstonLogger),
    new ResponseTransformInterceptor(),
  );

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(config.port);

  nestLogger.log(
    `🚀 TaxAI API running on http://localhost:${config.port}/${config.apiPrefix}`,
    'Bootstrap',
  );
  nestLogger.log(
    `❤️  Health: http://localhost:${config.port}/health/ready`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});