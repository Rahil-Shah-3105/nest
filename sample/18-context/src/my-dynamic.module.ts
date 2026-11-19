const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class MyDynamicModule {
  static register(dyanmicProviderValue: any): DynamicModule {
	logger.error(`>>> Entering register(dyanmicProviderValue=${dyanmicProviderValue})`, { "event.action": "register", "logrite.dyanmicProviderValue": dyanmicProviderValue });
	logger.warn(`<<< Exiting register(dyanmicProviderValue=${dyanmicProviderValue})`, { "event.action": "register", "logrite.dyanmicProviderValue": dyanmicProviderValue });
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
