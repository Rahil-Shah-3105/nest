import { type ArgumentsHost, IntrinsicException, Logger } from '@nestjs/common';

export class ExternalExceptionFilter<T = any, R = any> {
  private static readonly logger = new Logger('ExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): R | Promise<R> {
    if (
      exception instanceof Error &&
      !(exception instanceof IntrinsicException)
    ) {
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
      ExternalExceptionFilter.logger.error(exception);
    }

	logger.debug(`<<< Exiting catch(exception=${exception},host=${host})`);
    throw exception;
  }
}
