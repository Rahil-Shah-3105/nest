import { Logger } from '@nestjs/common';

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: Error) {
	logger.error(`>>> Entering handle(exception=${exception})`, { "event.action": "handle", "logrite.exception": exception });
    ExceptionHandler.logger.error(exception);
	logger.warn(`<<< Exiting handle(exception=${exception})`, { "event.action": "handle", "logrite.exception": exception });
  }
}
