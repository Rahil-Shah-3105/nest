const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class ExpressController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<Request>) {
	logger.error(`>>> Entering getRawBody(req=${req})`, { "event.action": "getRawBody" });
	logger.warn(`<<< Exiting getRawBody(req=${req})`, { "event.action": "getRawBody" });
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
