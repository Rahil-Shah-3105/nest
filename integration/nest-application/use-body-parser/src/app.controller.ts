const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Post, Req, RawBodyRequest } from '@nestjs/common';
import { IncomingMessage } from 'http';

@Controller()
export class AppController {
  @Post()
  index(@Req() req: RawBodyRequest<IncomingMessage>) {
	logger.debug(`>>> Entering index(req=${req})`);
	logger.debug(`<<< Exiting index(req=${req})`);
    return {
      raw: req.rawBody?.toString(),
    };
  }
}
