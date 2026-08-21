const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

declare const module: any;

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
logger.debug(`bootstrap(): app → ${app}`);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
	logger.debug('<<< Exiting bootstrap()');
  }
}
await bootstrap();
