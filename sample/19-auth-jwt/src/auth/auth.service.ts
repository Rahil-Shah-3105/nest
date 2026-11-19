const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(username: string, pass: string) {
	logger.error(`>>> Entering signIn(username=${username},pass=${pass})`, { "event.action": "signIn", "user.name": String(username), "logrite.pass": pass });
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
	logger.error(`signIn(username=${username},pass=${pass}): user → ${user}`, { "event.action": "signIn", "user.name": String(username), "logrite.pass": pass });
      throw new UnauthorizedException();
    }
    const payload = { username: user.username, sub: user.userId };
	logger.warn(`<<< Exiting signIn(username=${username},pass=${pass})`, { "event.action": "signIn", "user.name": String(username), "logrite.pass": pass });
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
