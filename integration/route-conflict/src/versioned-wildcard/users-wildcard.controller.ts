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
	logger.debug('>>> Entering profile()');
	logger.debug('<<< Exiting profile()');
    return { handler: 'profile' };
  }

  @Version('1')
  @Get('*')
  catchAll(@Param('*') tail: string) {
	logger.debug(`>>> Entering catchAll(tail=${tail})`);
	logger.debug(`<<< Exiting catchAll(tail=${tail})`);
    return { handler: 'catchAll', tail };
  }
}
