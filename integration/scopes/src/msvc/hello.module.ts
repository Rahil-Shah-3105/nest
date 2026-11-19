const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Inject, Module, Provider, Scope } from '@nestjs/common';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';
import { HttpController } from './http.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HelloController, HttpController],
  providers: [
    HelloService,
    UsersService,
    {
      provide: 'REQUEST_ID',
      useFactory: () => 1,
      scope: Scope.REQUEST,
    },
  ],
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
