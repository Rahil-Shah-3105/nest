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
	logger.debug(`>>> Entering signIn(signInDto=${signInDto})`);
	logger.debug(`<<< Exiting signIn(signInDto=${signInDto})`);
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
	logger.debug(`>>> Entering getProfile(req=${req})`);
	logger.debug(`<<< Exiting getProfile(req=${req})`);
    return req.user;
  }
}
