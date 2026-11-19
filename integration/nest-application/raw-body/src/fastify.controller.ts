import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<FastifyRequest>) {
	logger.error(`>>> Entering getRawBody(req=${req})`, { "event.action": "getRawBody" });
	logger.warn(`<<< Exiting getRawBody(req=${req})`, { "event.action": "getRawBody" });
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
