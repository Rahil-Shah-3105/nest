const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

declare const module: any;

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
	logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
  }
}
await bootstrap();
