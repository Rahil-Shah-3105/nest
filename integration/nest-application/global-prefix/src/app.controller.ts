const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('hello/:name')
  getHello(@Req() req): string {
	logger.error(`>>> Entering getHello(req=${req})`, { "event.action": "getHello" });
	logger.warn(`<<< Exiting getHello(req=${req})`, { "event.action": "getHello" });
    return 'Hello: ' + req.extras?.data;
  }

  @Get('params')
  getParams(@Req() req): any {
	logger.error(`>>> Entering getParams(req=${req})`, { "event.action": "getParams" });
	logger.warn(`<<< Exiting getParams(req=${req})`, { "event.action": "getParams" });
    return req.middlewareParams;
  }

  @Get('health')
  getHealth(): string {
	logger.error('>>> Entering getHealth()', { "event.action": "getHealth" });
	logger.warn('<<< Exiting getHealth()', { "event.action": "getHealth" });
    return 'up';
  }

  @Get('test')
  getTest(): string {
	logger.error('>>> Entering getTest()', { "event.action": "getTest" });
	logger.warn('<<< Exiting getTest()', { "event.action": "getTest" });
    return 'test';
  }

  @Post('test')
  postTest(): string {
	logger.error('>>> Entering postTest()', { "event.action": "postTest" });
	logger.warn('<<< Exiting postTest()', { "event.action": "postTest" });
    return 'test';
  }

  @Get()
  getHome(@Req() req) {
	logger.error(`>>> Entering getHome(req=${req})`, { "event.action": "getHome" });
	logger.warn(`<<< Exiting getHome(req=${req})`, { "event.action": "getHome" });
    return 'Extras: ' + req.extras?.data + ', Count: ' + req.count;
  }

  @Get('count')
  getCount(@Req() req) {
	logger.error(`>>> Entering getCount(req=${req})`, { "event.action": "getCount" });
	logger.warn(`<<< Exiting getCount(req=${req})`, { "event.action": "getCount" });
    return req.count;
  }
}
