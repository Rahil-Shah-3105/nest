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
	logger.debug(`>>> Entering signIn(username=${username},pass=${pass})`);
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = { username: user.username, sub: user.userId };
	logger.debug(`<<< Exiting signIn(username=${username},pass=${pass})`);
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
