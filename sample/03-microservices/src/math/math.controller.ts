const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { MATH_SERVICE } from './math.constants.js';

@Controller()
export class MathController {
  constructor(@Inject(MATH_SERVICE) private readonly client: ClientProxy) {}

  @Get()
  execute(): Observable<number> {
	logger.debug('>>> Entering execute()');
    const pattern = { cmd: 'sum' };
	logger.debug(`execute(): pattern → ${pattern}`);
    const data = [1, 2, 3, 4, 5];
	logger.debug(`execute(): data → ${data}`);
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
	logger.debug(`>>> Entering sum(data=${data})`);
	logger.debug(`<<< Exiting sum(data=${data})`);
    return (data || []).reduce((a, b) => a + b);
  }
}
