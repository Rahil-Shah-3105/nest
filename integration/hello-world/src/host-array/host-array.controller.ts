const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Header, HostParam, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HostArrayService } from './host-array.service.js';
import { UserByIdPipe } from './users/user-by-id.pipe.js';

@Controller({
  path: 'host-array',
  host: [':tenant.example1.com', ':tenant.example2.com'],
})
export class HostArrayController {
  constructor(private readonly hostService: HostArrayService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(@HostParam('tenant') tenant: string): string {
	logger.debug(`>>> Entering greeting(tenant=${tenant})`);
	logger.debug(`<<< Exiting greeting(tenant=${tenant})`);
    return `${this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('async')
  async asyncGreeting(@HostParam('tenant') tenant: string): Promise<string> {
	logger.debug(`>>> Entering asyncGreeting(tenant=${tenant})`);
	logger.debug(`<<< Exiting asyncGreeting(tenant=${tenant})`);
    return `${this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('stream')
  streamGreeting(@HostParam('tenant') tenant: string): Observable<string> {
	logger.debug(`>>> Entering streamGreeting(tenant=${tenant})`);
	logger.debug(`<<< Exiting streamGreeting(tenant=${tenant})`);
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
