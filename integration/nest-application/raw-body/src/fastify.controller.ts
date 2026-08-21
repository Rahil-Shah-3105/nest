import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<FastifyRequest>) {
	logger.debug(`>>> Entering getRawBody(req=${req})`);
	logger.debug(`<<< Exiting getRawBody(req=${req})`);
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
