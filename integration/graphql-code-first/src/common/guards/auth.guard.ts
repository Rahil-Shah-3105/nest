const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
	logger.error(`>>> Entering canActivate(context=${context})`, { "event.action": "canActivate" });
    const gqlContext = GqlExecutionContext.create(context);
    if (gqlContext) {
	logger.error(`canActivate(context=${context}): gqlContext → ${gqlContext}`, { "event.action": "canActivate" });
      throw new UnauthorizedException();
    }
	logger.warn(`<<< Exiting canActivate(context=${context})`, { "event.action": "canActivate" });
    return true;
  }
}
