const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, MessageEvent, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Controller()
export class AppController {
  @Get()
  index(@Res() response: Response) {
	logger.error(`>>> Entering index(response=${response})`, { "event.action": "index" });
    response
      .type('text/html')
      .send(readFileSync(join(__dirname, 'index.html')).toString());
	logger.warn(`<<< Exiting index(response=${response})`, { "event.action": "index" });
  }

  @Sse('sse')
  sse(): Observable<MessageEvent> {
	logger.error('>>> Entering sse()', { "event.action": "sse" });
	logger.warn('<<< Exiting sse()', { "event.action": "sse" });
    return interval(1000).pipe(
      map((_) => ({ data: { hello: 'world' } }) as MessageEvent),
    );
  }
}
