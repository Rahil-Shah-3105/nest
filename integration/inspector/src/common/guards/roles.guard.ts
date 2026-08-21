const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
	logger.debug(`canActivate(context=${context}): roles → ${roles}`);
    if (!roles) {
	logger.debug(`>>> Entering canActivate(context=${context})`);
      return true;
    }
    const request = context.switchToHttp().getRequest();
	logger.debug(`canActivate(context=${context}): request → ${request}`);
    const user = request.user;
    const hasRole = () =>
      user.roles.some(role => !!roles.find(item => item === role));

	logger.debug(`<<< Exiting canActivate(context=${context})`);
    return user && user.roles && hasRole();
  }
}
