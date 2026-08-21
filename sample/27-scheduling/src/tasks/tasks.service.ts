import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('45 * * * * *')
  handleCron() {
	logger.debug('>>> Entering handleCron()');
    this.logger.debug('Called when the second is 45');
	logger.debug('<<< Exiting handleCron()');
  }

  @Interval(10000)
  handleInterval() {
	logger.debug('>>> Entering handleInterval()');
    this.logger.debug('Called every 10 seconds');
	logger.debug('<<< Exiting handleInterval()');
  }

  @Timeout(5000)
  handleTimeout() {
	logger.debug('>>> Entering handleTimeout()');
    this.logger.debug('Called once after 5 seconds');
	logger.debug('<<< Exiting handleTimeout()');
  }
}
