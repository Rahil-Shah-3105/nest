import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('45 * * * * *')
  handleCron() {
	logger.error('>>> Entering handleCron()', { "event.action": "handleCron" });
    this.logger.debug('Called when the second is 45');
	logger.warn('<<< Exiting handleCron()', { "event.action": "handleCron" });
  }

  @Interval(10000)
  handleInterval() {
	logger.error('>>> Entering handleInterval()', { "event.action": "handleInterval" });
    this.logger.debug('Called every 10 seconds');
	logger.warn('<<< Exiting handleInterval()', { "event.action": "handleInterval" });
  }

  @Timeout(5000)
  handleTimeout() {
	logger.error('>>> Entering handleTimeout()', { "event.action": "handleTimeout" });
    this.logger.debug('Called once after 5 seconds');
	logger.warn('<<< Exiting handleTimeout()', { "event.action": "handleTimeout" });
  }
}
