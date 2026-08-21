const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class MyDynamicModule {
  static register(dyanmicProviderValue: any): DynamicModule {
	logger.debug(`>>> Entering register(dyanmicProviderValue=${dyanmicProviderValue})`);
	logger.debug(`<<< Exiting register(dyanmicProviderValue=${dyanmicProviderValue})`);
    return {
      module: MyDynamicModule,
      providers: [
        {
          provide: 'MyDynamicProvider',
          useValue: dyanmicProviderValue,
        },
      ],
      exports: ['MyDynamicProvider'],
    };
  }
}
