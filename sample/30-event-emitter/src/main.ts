const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
logger.debug(`bootstrap(): app → ${app}`);
}
await bootstrap();
