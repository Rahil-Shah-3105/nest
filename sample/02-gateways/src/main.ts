const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.debug('>>> Entering bootstrap()');
  const app = await NestFactory.create(AppModule);

logger.debug(`bootstrap(): app → ${app}`);
  // Uncomment these lines to use the Redis adapter:
  // const redisIoAdapter = new RedisIoAdapter(app);
  // await redisIoAdapter.connectToRedis();
  // app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
logger.debug('<<< Exiting bootstrap()');
}
await bootstrap();
