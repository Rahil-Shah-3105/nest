const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { BadRequestException, Controller, Get, Header } from '@nestjs/common';

@Controller()
export class ErrorsController {
  @Get('sync')
  synchronous() {
	logger.debug('>>> Entering synchronous()');
    this.throwError();
	logger.debug('<<< Exiting synchronous()');
  }

  @Get('async')
  async asynchronous() {
	logger.debug('>>> Entering asynchronous()');
    this.throwError();
	logger.debug('<<< Exiting asynchronous()');
  }

  @Get('unexpected-error')
  @Header('Content-Type', 'application/pdf')
  unexpectedError() {
	logger.debug('>>> Entering unexpectedError()');
	logger.debug('<<< Exiting unexpectedError()');
    throw new Error();
  }

  throwError() {
	logger.debug('>>> Entering throwError()');
	logger.debug('<<< Exiting throwError()');
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Integration test',
    });
  }
}
