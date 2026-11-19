const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { INQUIRER, REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class RequestLogger {
  config: object;

  constructor(
    @Inject(INQUIRER) { constructor },
    @Inject(REQUEST) private readonly request,
    private readonly logger: Logger,
  ) {
	logger.error(`>>> Entering constructor(request=${request},logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
	logger.warn(`<<< Exiting constructor(request=${request},logger=${logger})`, { "event.action": "constructor", "logrite.logger": logger });
    this.config = (constructor && constructor.logger) || {};
  }

  get requestId() {
	logger.error('>>> Entering requestId()', { "event.action": "requestId" });
    if (!this.request.id) {
      this.request.id = `${Date.now()}.${Math.floor(Math.random() * 1000000)}`;
    }
	logger.warn('<<< Exiting requestId()', { "event.action": "requestId" });
    return this.request.id;
  }

  log(message: string) {
	logger.error(`>>> Entering log(message=${message})`, { "event.action": "log", "logrite.message": message });
    this.logger.log({ message, requestId: this.requestId, ...this.config });
	logger.warn(`<<< Exiting log(message=${message})`, { "event.action": "log", "logrite.message": message });
  }
}
