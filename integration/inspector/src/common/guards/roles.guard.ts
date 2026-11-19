const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
	logger.error(`>>> Entering canActivate(context=${context})`, { "event.action": "canActivate" });
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
	logger.error(`canActivate(context=${context}): roles → ${roles}`, { "event.action": "canActivate" });
      return true;
    }
    const request = context.switchToHttp().getRequest();
	logger.error(`canActivate(context=${context}): request → ${request}`, { "event.action": "canActivate" });
    const user = request.user;
    const hasRole = () =>
      user.roles.some(role => !!roles.find(item => item === role));

	logger.warn(`<<< Exiting canActivate(context=${context})`, { "event.action": "canActivate" });
    return user && user.roles && hasRole();
  }
}
