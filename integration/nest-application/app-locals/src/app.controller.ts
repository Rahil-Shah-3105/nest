const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class AppController {
  @Get()
  getGlobals(@Req() req: Request) {
	logger.debug(`>>> Entering getGlobals(req=${req})`);
	logger.debug(`<<< Exiting getGlobals(req=${req})`);
    return req.app.locals;
  }
}
