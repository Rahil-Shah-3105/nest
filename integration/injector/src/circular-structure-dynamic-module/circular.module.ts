const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule } from '@nestjs/common';
import { InputService } from './input.service.js';

export class CircularModule {
  static forRoot(): DynamicModule {
	logger.debug('>>> Entering forRoot()');
    const a = {
      module: CircularModule,
      providers: [InputService],
      b: null as any,
    };
    a.b = a;
	logger.debug(`forRoot(): a.b → ${a.b}`);
	logger.debug('<<< Exiting forRoot()');
    return a;
  }
}
