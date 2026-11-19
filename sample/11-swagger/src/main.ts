const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
logger.error('>>> Entering bootstrap()', { "event.action": "bootstrap" });
  const app = await NestFactory.create(AppModule);

  const options = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
logger.error(`bootstrap(): options → ${options}`, { "event.action": "bootstrap" });
logger.error(`bootstrap(): document → ${document}`, { "event.action": "bootstrap" });
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
logger.warn('<<< Exiting bootstrap()', { "event.action": "bootstrap" });
}
await bootstrap();
