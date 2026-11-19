const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3001);
logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
void bootstrap();
