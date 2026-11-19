const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';
import { DurableService } from './durable.service.js';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableGuard implements CanActivate {
  public instanceCounter = 0;
  constructor(private readonly durableService: DurableService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
	logger.error(`>>> Entering canActivate(context=${context})`, { "event.action": "canActivate" });
    if (typeof this.durableService === 'undefined') {
      throw new Error('Durable service is undefined');
    }
    this.instanceCounter++;
	logger.warn(`<<< Exiting canActivate(context=${context})`, { "event.action": "canActivate" });
    return true;
  }
}
