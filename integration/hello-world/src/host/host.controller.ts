const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Header, HostParam, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HostService } from './host.service.js';
import { UserByIdPipe } from './users/user-by-id.pipe.js';

@Controller({
  path: 'host',
  host: ':tenant.example.com',
})
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(@HostParam('tenant') tenant: string): string {
	logger.error(`>>> Entering greeting(tenant=${tenant})`, { "event.action": "greeting", "logrite.tenant": tenant });
	logger.warn(`<<< Exiting greeting(tenant=${tenant})`, { "event.action": "greeting", "logrite.tenant": tenant });
    return `${this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('async')
  async asyncGreeting(@HostParam('tenant') tenant: string): Promise<string> {
	logger.error(`>>> Entering asyncGreeting(tenant=${tenant})`, { "event.action": "asyncGreeting", "logrite.tenant": tenant });
	logger.warn(`<<< Exiting asyncGreeting(tenant=${tenant})`, { "event.action": "asyncGreeting", "logrite.tenant": tenant });
    return `${this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('stream')
  streamGreeting(@HostParam('tenant') tenant: string): Observable<string> {
	logger.error(`>>> Entering streamGreeting(tenant=${tenant})`, { "event.action": "streamGreeting", "logrite.tenant": tenant });
	logger.warn(`<<< Exiting streamGreeting(tenant=${tenant})`, { "event.action": "streamGreeting", "logrite.tenant": tenant });
    return of(`${this.hostService.greeting()} tenant=${tenant}`);
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
    @HostParam('tenant') tenant: string,
  ): any {
    return { ...user, tenant };
  }
}
