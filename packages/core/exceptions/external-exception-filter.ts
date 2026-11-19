import { type ArgumentsHost, IntrinsicException, Logger } from '@nestjs/common';

export class ExternalExceptionFilter<T = any, R = any> {
  private static readonly logger = new Logger('ExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): R | Promise<R> {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    if (
      exception instanceof Error &&
      !(exception instanceof IntrinsicException)
    ) {
      ExternalExceptionFilter.logger.error(exception);
    }

	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    throw exception;
  }
}
