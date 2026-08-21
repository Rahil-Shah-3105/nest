const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module.js';

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3000);
logger.debug(`bootstrap(): app → ${app}`);
}
void bootstrap();
