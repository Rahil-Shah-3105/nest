const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const ctx = host.switchToHttp();
	logger.error(`Exception in catch(exception=${exception},host=${host}): ${(exception as Error).message}`, exception, { "event.action": "catch", "event.category": "process", "logrite.exception": exception, "logrite.host": host });
	logger.error(`catch(exception=${exception},host=${host}): ctx → ${ctx}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const response = ctx.getResponse();
    const request = ctx.getRequest();
	logger.error(`catch(exception=${exception},host=${host}): response → ${response}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const statusCode = exception.getStatus();
	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
