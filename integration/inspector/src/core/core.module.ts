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
	logger.debug(`>>> Entering configure(consumer=${consumer})`);
    consumer.apply(LoggerMiddleware).forRoutes(CatsController);
	logger.debug(`<<< Exiting configure(consumer=${consumer})`);
  }
}
