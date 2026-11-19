const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { NestedTransientService } from './nested-transient.service.js';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientLoggerService {
  static COUNTER = 0;
  public readonly instanceId: number;

  constructor(public readonly nested: NestedTransientService) {
	logger.error(`>>> Entering constructor(nested=${nested})`, { "event.action": "constructor", "logrite.nested": nested });
    TransientLoggerService.COUNTER++;
    this.instanceId = TransientLoggerService.COUNTER;
	logger.debug(`constructor(nested=${nested}): this.instanceId → ${this.instanceId}`, { "event.action": "constructor", "logrite.nested": nested });
	logger.warn(`<<< Exiting constructor(nested=${nested})`, { "event.action": "constructor", "logrite.nested": nested });
  }

  setContext(ctx: string) {
	logger.error(`>>> Entering setContext(ctx=${ctx})`, { "event.action": "setContext" });
    this.nested.setContext(`NESTED-${ctx}`);
	logger.warn(`<<< Exiting setContext(ctx=${ctx})`, { "event.action": "setContext" });
  }

  getNestedContext(): string | undefined {
	logger.error('>>> Entering getNestedContext()', { "event.action": "getNestedContext" });
	logger.warn('<<< Exiting getNestedContext()', { "event.action": "getNestedContext" });
    return this.nested.getContext();
  }

  getNestedInstanceId(): number {
	logger.error('>>> Entering getNestedInstanceId()', { "event.action": "getNestedInstanceId" });
	logger.warn('<<< Exiting getNestedInstanceId()', { "event.action": "getNestedInstanceId" });
    return this.nested.instanceId;
  }
}
