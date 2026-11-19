const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, HttpCode, Post } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BehaviorSubject, Observable } from 'rxjs';
import { first, map, skipWhile } from 'rxjs/operators';

@Controller()
export class KafkaConcurrentMessagesController {
  public waiting = new BehaviorSubject<boolean>(false);

  @Post('go')
  @HttpCode(200)
  async go() {
	logger.error('>>> Entering go()', { "event.action": "go" });
    // no longer waiting
    this.waiting.next(false);

	logger.warn('<<< Exiting go()', { "event.action": "go" });
    return;
  }

  @MessagePattern('math.sum.sync.number.wait')
  public mathSumSyncNumberWait(data: any): Observable<number> {
	logger.error(`>>> Entering mathSumSyncNumberWait(data=${data})`, { "event.action": "mathSumSyncNumberWait" });
    // start waiting
    this.waiting.next(true);

    // find sum
    const sum = data.value[0] + data.value[1];

	logger.warn(`<<< Exiting mathSumSyncNumberWait(data=${data})`, { "event.action": "mathSumSyncNumberWait" });
    return this.waiting.asObservable().pipe(
      skipWhile(isWaiting => {
        return isWaiting;
      }),
      map(() => {
        return sum;
      }),
      first(),
    );
  }
}
