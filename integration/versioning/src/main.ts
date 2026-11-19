const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule);
  app.enableVersioning({
    type: VersioningType.MEDIA_TYPE,
    key: 'v=',
  });

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
void bootstrap();
