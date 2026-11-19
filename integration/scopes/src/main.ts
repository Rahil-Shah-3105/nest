const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3000);
logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
}
void bootstrap();
