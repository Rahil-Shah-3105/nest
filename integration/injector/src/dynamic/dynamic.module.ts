const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module, DynamicModule } from '@nestjs/common';

export const DYNAMIC_TOKEN = 'DYNAMIC_TOKEN';
export const DYNAMIC_VALUE = {};

export const dynamicProvider = {
  provide: DYNAMIC_TOKEN,
  useValue: DYNAMIC_VALUE,
};

@Module({})
export class NestDynamicModule {
  static byObject(): DynamicModule {
	logger.error('>>> Entering byObject()', { "event.action": "byObject" });
	logger.warn('<<< Exiting byObject()', { "event.action": "byObject" });
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [dynamicProvider],
    };
  }

  static byName(): DynamicModule {
	logger.error('>>> Entering byName()', { "event.action": "byName" });
	logger.warn('<<< Exiting byName()', { "event.action": "byName" });
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [DYNAMIC_TOKEN],
    };
  }
}
