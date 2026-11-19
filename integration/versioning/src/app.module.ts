const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppV1Controller } from './app-v1.controller.js';
import { AppV2Controller } from './app-v2.controller.js';
import { MiddlewareController } from './middleware.controller.js';
import { MultipleMiddlewareVersionController } from './multiple-middleware.controller.js';
import { MultipleVersionController } from './multiple.controller.js';
import { VersionNeutralMiddlewareController } from './neutral-middleware.controller.js';
import { VersionNeutralController } from './neutral.controller.js';
import { NoVersioningController } from './no-versioning.controller.js';
import { OverridePartialController } from './override-partial.controller.js';
import { OverrideController } from './override.controller.js';

@Module({
  imports: [],
  controllers: [
    AppV1Controller,
    AppV2Controller,
    MultipleVersionController,
    NoVersioningController,
    VersionNeutralController,
    OverrideController,
    OverridePartialController,
    MiddlewareController,
    MultipleMiddlewareVersionController,
    VersionNeutralMiddlewareController,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
	logger.error(`>>> Entering configure(consumer=${consumer})`, { "event.action": "configure", "logrite.consumer": consumer });
    consumer
      .apply((req, res) => res.end('Hello from middleware function!'))
      .forRoutes(
        MiddlewareController,
        MultipleMiddlewareVersionController,
        VersionNeutralMiddlewareController,
      );
	logger.warn(`<<< Exiting configure(consumer=${consumer})`, { "event.action": "configure", "logrite.consumer": consumer });
  }
}
