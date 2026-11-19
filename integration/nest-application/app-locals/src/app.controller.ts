const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class AppController {
  @Get()
  getGlobals(@Req() req: Request) {
	logger.error(`>>> Entering getGlobals(req=${req})`, { "event.action": "getGlobals" });
	logger.warn(`<<< Exiting getGlobals(req=${req})`, { "event.action": "getGlobals" });
    return req.app.locals;
  }
}
