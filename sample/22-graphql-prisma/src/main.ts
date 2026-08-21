const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
logger.debug(`bootstrap(): app → ${app}`);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`GraphQL Playground: ${await app.getUrl()}/graphql`);
logger.debug('<<< Exiting bootstrap()');
}
await bootstrap();
