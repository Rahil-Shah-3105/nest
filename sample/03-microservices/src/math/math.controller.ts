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
	logger.error('>>> Entering execute()', { "event.action": "execute" });
    const pattern = { cmd: 'sum' };
    const data = [1, 2, 3, 4, 5];
	logger.error(`execute(): pattern → ${pattern}`, { "event.action": "execute" });
	logger.error(`execute(): data → ${data}`, { "event.action": "execute" });
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
	logger.error(`>>> Entering sum(data=${data})`, { "event.action": "sum" });
	logger.warn(`<<< Exiting sum(data=${data})`, { "event.action": "sum" });
    return (data || []).reduce((a, b) => a + b);
  }
}
