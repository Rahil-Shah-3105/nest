const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, Scope } from '@nestjs/common';
import { NestedTransientService } from './nested-transient.service.js';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientLoggerService {
  static COUNTER = 0;
  public readonly instanceId: number;

  constructor(public readonly nested: NestedTransientService) {
	logger.debug(`>>> Entering constructor(NestedTransientService=${NestedTransientService})`);
    TransientLoggerService.COUNTER++;
    this.instanceId = TransientLoggerService.COUNTER;
	logger.debug(`constructor(NestedTransientService=${NestedTransientService}): this.instanceId → ${this.instanceId}`);
  }

  setContext(ctx: string) {
	logger.debug(`>>> Entering setContext(ctx=${ctx})`);
    this.nested.setContext(`NESTED-${ctx}`);
	logger.debug(`<<< Exiting setContext(ctx=${ctx})`);
  }

  getNestedContext(): string | undefined {
	logger.debug('>>> Entering getNestedContext()');
	logger.debug('<<< Exiting getNestedContext()');
    return this.nested.getContext();
  }

  getNestedInstanceId(): number {
	logger.debug('>>> Entering getNestedInstanceId()');
	logger.debug('<<< Exiting getNestedInstanceId()');
    return this.nested.instanceId;
  }
}
