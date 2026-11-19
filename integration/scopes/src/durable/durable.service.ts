const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Inject,
  Injectable,
  PreconditionFailedException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy.js';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableService {
  public instanceCounter = 0;

  constructor(@Inject(REQUEST) private readonly requestPayload: TenantContext) {
	logger.error(`>>> Entering constructor(requestPayload=${requestPayload})`, { "event.action": "constructor" });
    if (requestPayload.forceError) {
	logger.warn(`<<< Exiting constructor(requestPayload=${requestPayload})`, { "event.action": "constructor" });
      throw new PreconditionFailedException('Forced error');
    }
  }

  greeting() {
    ++this.instanceCounter;
	logger.error('>>> Entering greeting()', { "event.action": "greeting" });
	logger.warn('<<< Exiting greeting()', { "event.action": "greeting" });
    return `Hello world! Counter: ${this.instanceCounter}`;
  }

  getTenantId() {
	logger.error('>>> Entering getTenantId()', { "event.action": "getTenantId" });
	logger.warn('<<< Exiting getTenantId()', { "event.action": "getTenantId" });
    return this.requestPayload.tenantId;
  }
}
