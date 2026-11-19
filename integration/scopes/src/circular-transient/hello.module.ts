const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Inject, Module, Provider } from '@nestjs/common';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';
import { TestController } from './test.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HelloController, TestController],
  providers: [HelloService, UsersService],
})
export class HelloModule {
  constructor(@Inject('META') private readonly meta) {}

  static forRoot(meta: Provider): DynamicModule {
	logger.error(`>>> Entering forRoot(meta=${meta})`, { "event.action": "forRoot", "logrite.meta": meta });
	logger.warn(`<<< Exiting forRoot(meta=${meta})`, { "event.action": "forRoot", "logrite.meta": meta });
    return {
      module: HelloModule,
      providers: [meta],
    };
  }
}
