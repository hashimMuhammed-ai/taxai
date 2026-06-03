import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  app.enableShutdownHooks();

  logger.log('⚙️  TaxAI Worker is running and consuming queues', 'WorkerBootstrap');
}

bootstrap().catch((err) => {
  console.error('Fatal error in worker:', err);
  process.exit(1);
});