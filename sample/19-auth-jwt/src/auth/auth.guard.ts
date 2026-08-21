const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { jwtConstants } from './constants.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
	logger.debug(`>>> Entering canActivate(context=${context})`);
      // 💡 See this condition
      return true;
    }

    const request = context.switchToHttp().getRequest();
	logger.debug(`canActivate(context=${context}): request → ${request}`);
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
	logger.debug(`canActivate(context=${context}): payload → ${payload}`);
    } catch {
	logger.error(`Exception in canActivate(context=${context}): (no error binding)`);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
	logger.debug(`>>> Entering extractTokenFromHeader(request=${request})`);
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
	logger.debug(`<<< Exiting extractTokenFromHeader(request=${request})`);
    return type === 'Bearer' ? token : undefined;
  }
}
