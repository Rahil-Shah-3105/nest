const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class ExpressController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<Request>) {
	logger.debug(`>>> Entering getRawBody(req=${req})`);
	logger.debug(`<<< Exiting getRawBody(req=${req})`);
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
