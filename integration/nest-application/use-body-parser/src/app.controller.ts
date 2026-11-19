const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Post, Req, RawBodyRequest } from '@nestjs/common';
import { IncomingMessage } from 'http';

@Controller()
export class AppController {
  @Post()
  index(@Req() req: RawBodyRequest<IncomingMessage>) {
	logger.error(`>>> Entering index(req=${req})`, { "event.action": "index" });
	logger.warn(`<<< Exiting index(req=${req})`, { "event.action": "index" });
    return {
      raw: req.rawBody?.toString(),
    };
  }
}
