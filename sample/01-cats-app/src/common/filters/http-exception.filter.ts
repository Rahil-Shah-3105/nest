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
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
	logger.debug(`catch(exception=${exception},host=${host}): ctx → ${ctx}`);
	logger.debug(`catch(exception=${exception},host=${host}): response → ${response}`);
    const request = ctx.getRequest();
    const statusCode = exception.getStatus();
	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
