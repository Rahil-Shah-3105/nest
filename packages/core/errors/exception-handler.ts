import { Logger } from '@nestjs/common';

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: Error) {
	logger.debug(`>>> Entering handle(exception=${exception})`);
    ExceptionHandler.logger.error(exception);
	logger.debug(`<<< Exiting handle(exception=${exception})`);
  }
}
