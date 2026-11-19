const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
	logger.error(`>>> Entering signIn(signInDto=${signInDto})`, { "event.action": "signIn", "logrite.signInDto": signInDto });
	logger.warn(`<<< Exiting signIn(signInDto=${signInDto})`, { "event.action": "signIn", "logrite.signInDto": signInDto });
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
	logger.error(`>>> Entering getProfile(req=${req})`, { "event.action": "getProfile" });
	logger.warn(`<<< Exiting getProfile(req=${req})`, { "event.action": "getProfile" });
    return req.user;
  }
}
