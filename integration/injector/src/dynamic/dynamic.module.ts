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
	logger.debug('>>> Entering byObject()');
	logger.debug('<<< Exiting byObject()');
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [dynamicProvider],
    };
  }

  static byName(): DynamicModule {
	logger.debug('>>> Entering byName()');
	logger.debug('<<< Exiting byName()');
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [DYNAMIC_TOKEN],
    };
  }
}
