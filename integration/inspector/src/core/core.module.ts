const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CatsController } from '../cats/cats.controller.js';
import { LoggerMiddleware } from '../common/middleware/logger.middleware.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
	logger.error(`>>> Entering configure(consumer=${consumer})`, { "event.action": "configure", "logrite.consumer": consumer });
    consumer.apply(LoggerMiddleware).forRoutes(CatsController);
	logger.warn(`<<< Exiting configure(consumer=${consumer})`, { "event.action": "configure", "logrite.consumer": consumer });
  }
}
