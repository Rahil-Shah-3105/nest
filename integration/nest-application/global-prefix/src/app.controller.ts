const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('hello/:name')
  getHello(@Req() req): string {
	logger.debug(`>>> Entering getHello(req=${req})`);
	logger.debug(`<<< Exiting getHello(req=${req})`);
    return 'Hello: ' + req.extras?.data;
  }

  @Get('params')
  getParams(@Req() req): any {
	logger.debug(`>>> Entering getParams(req=${req})`);
	logger.debug(`<<< Exiting getParams(req=${req})`);
    return req.middlewareParams;
  }

  @Get('health')
  getHealth(): string {
	logger.debug('>>> Entering getHealth()');
	logger.debug('<<< Exiting getHealth()');
    return 'up';
  }

  @Get('test')
  getTest(): string {
	logger.debug('>>> Entering getTest()');
	logger.debug('<<< Exiting getTest()');
    return 'test';
  }

  @Post('test')
  postTest(): string {
	logger.debug('>>> Entering postTest()');
	logger.debug('<<< Exiting postTest()');
    return 'test';
  }

  @Get()
  getHome(@Req() req) {
	logger.debug(`>>> Entering getHome(req=${req})`);
	logger.debug(`<<< Exiting getHome(req=${req})`);
    return 'Extras: ' + req.extras?.data + ', Count: ' + req.count;
  }

  @Get('count')
  getCount(@Req() req) {
	logger.debug(`>>> Entering getCount(req=${req})`);
	logger.debug(`<<< Exiting getCount(req=${req})`);
    return req.count;
  }
}
