const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { BadRequestException, Controller, Get, Header } from '@nestjs/common';

@Controller()
export class ErrorsController {
  @Get('sync')
  synchronous() {
	logger.error('>>> Entering synchronous()', { "event.action": "synchronous" });
    this.throwError();
	logger.warn('<<< Exiting synchronous()', { "event.action": "synchronous" });
  }

  @Get('async')
  async asynchronous() {
	logger.error('>>> Entering asynchronous()', { "event.action": "asynchronous" });
    this.throwError();
	logger.warn('<<< Exiting asynchronous()', { "event.action": "asynchronous" });
  }

  @Get('unexpected-error')
  @Header('Content-Type', 'application/pdf')
  unexpectedError() {
	logger.error('>>> Entering unexpectedError()', { "event.action": "unexpectedError" });
	logger.warn('<<< Exiting unexpectedError()', { "event.action": "unexpectedError" });
    throw new Error();
  }

  throwError() {
	logger.error('>>> Entering throwError()', { "event.action": "throwError" });
	logger.warn('<<< Exiting throwError()', { "event.action": "throwError" });
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Integration test',
    });
  }
}
