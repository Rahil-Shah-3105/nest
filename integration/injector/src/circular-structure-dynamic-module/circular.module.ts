const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule } from '@nestjs/common';
import { InputService } from './input.service.js';

export class CircularModule {
  static forRoot(): DynamicModule {
	logger.error('>>> Entering forRoot()', { "event.action": "forRoot" });
    const a = {
      module: CircularModule,
      providers: [InputService],
      b: null as any,
    };
    a.b = a;
	logger.debug(`forRoot(): a.b → ${a.b}`, { "event.action": "forRoot" });
	logger.warn('<<< Exiting forRoot()', { "event.action": "forRoot" });
    return a;
  }
}
