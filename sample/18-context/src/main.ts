const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { AppModule, dynamicModule } from './app.module.js';
import { AppService } from './app.service.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.createApplicationContext(AppModule);

logger.error(`bootstrap(): app → ${app}`, { "event.action": "bootstrap" });
  const appService = app.get(AppService);
  console.log('AppService#getHello:', appService.getHello());

  // Note that below we can't use `app.select(MyDynamicModule)` otherwise we would get an error as the static version of `MyDynamicModule` was not imported anywhere
  const myDynamicProviderValue = app
    .select(dynamicModule)
    .get('MyDynamicProvider');
  console.log('MyDynamicProvider:', myDynamicProviderValue);

logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
  return app.close();
}
await bootstrap();
