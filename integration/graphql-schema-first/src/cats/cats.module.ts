const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { DynamicModule, Module, Scope } from '@nestjs/common';
import { CatsRequestScopedService } from './cats-request-scoped.service.js';
import { CatsResolvers } from './cats.resolvers.js';
import { CatsService } from './cats.service.js';

@Module({
  providers: [CatsService, CatsResolvers],
})
export class CatsModule {
  static enableRequestScope(): DynamicModule {
	logger.error('>>> Entering enableRequestScope()', { "event.action": "enableRequestScope" });
	logger.warn('<<< Exiting enableRequestScope()', { "event.action": "enableRequestScope" });
    return {
      module: CatsModule,
      providers: [
        {
          provide: CatsService,
          useClass: CatsRequestScopedService,
          scope: Scope.REQUEST,
        },
      ],
    };
  }
}
