const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class CatsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
	logger.error(`>>> Entering canActivate(context=${context})`, { "event.action": "canActivate" });
    const ctx = GqlExecutionContext.create(context);
	logger.error(`canActivate(context=${context}): ctx → ${ctx}`, { "event.action": "canActivate" });
    return true;
  }
}
