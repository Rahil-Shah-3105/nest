const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
  await app.listen(3000);
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
void bootstrap();
