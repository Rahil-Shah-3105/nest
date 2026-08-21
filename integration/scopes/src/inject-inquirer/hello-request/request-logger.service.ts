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
    this.config = (constructor && constructor.logger) || {};
  }

  get requestId() {
	logger.debug('>>> Entering requestId()');
    if (!this.request.id) {
      this.request.id = `${Date.now()}.${Math.floor(Math.random() * 1000000)}`;
    }
	logger.debug('<<< Exiting requestId()');
    return this.request.id;
  }

  log(message: string) {
	logger.debug(`>>> Entering log(message=${message})`);
    this.logger.log({ message, requestId: this.requestId, ...this.config });
	logger.debug(`<<< Exiting log(message=${message})`);
  }
}
