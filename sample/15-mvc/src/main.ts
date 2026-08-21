const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from './app.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

logger.debug(`bootstrap(): app → ${app}`);
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
logger.debug('<<< Exiting bootstrap()');
}
await bootstrap();
