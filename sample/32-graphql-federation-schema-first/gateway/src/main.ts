const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
await bootstrap();
