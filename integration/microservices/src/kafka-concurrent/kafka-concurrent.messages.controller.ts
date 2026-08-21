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
	logger.debug('>>> Entering go()');
    // no longer waiting
    this.waiting.next(false);

	logger.debug('<<< Exiting go()');
    return;
  }

  @MessagePattern('math.sum.sync.number.wait')
  public mathSumSyncNumberWait(data: any): Observable<number> {
    // start waiting
    this.waiting.next(true);

    // find sum
    const sum = data.value[0] + data.value[1];

	logger.debug(`>>> Entering mathSumSyncNumberWait(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncNumberWait(data=${data})`);
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
