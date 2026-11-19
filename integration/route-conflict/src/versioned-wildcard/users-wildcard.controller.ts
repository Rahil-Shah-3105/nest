const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Param, Version } from '@nestjs/common';

// Fastify uses `find-my-way`, whose catch-all is the bare `*` at the
// end of the path (a single unnamed wildcard); the Express-5 named
// form `*path` / `{*path}` is rejected with "Wildcard must be the last
// character in the route". On Express, `*` is auto-converted to a
// named wildcard by `LegacyRouteConverter`, so `@Get('*')` is the only
// catch-all form that works on both adapters and round-trips through
// the resolver pipeline.
@Controller({ path: 'users' })
export class UsersWildcardController {
  @Get('profile')
  profile() {
	logger.error('>>> Entering profile()', { "event.action": "profile" });
	logger.warn('<<< Exiting profile()', { "event.action": "profile" });
    return { handler: 'profile' };
  }

  @Version('1')
  @Get('*')
  catchAll(@Param('*') tail: string) {
	logger.error(`>>> Entering catchAll(tail=${tail})`, { "event.action": "catchAll", "logrite.tail": tail });
	logger.warn(`<<< Exiting catchAll(tail=${tail})`, { "event.action": "catchAll", "logrite.tail": tail });
    return { handler: 'catchAll', tail };
  }
}
