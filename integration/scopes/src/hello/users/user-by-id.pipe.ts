const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  ArgumentMetadata,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { UsersService } from './users.service.js';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [] as number[];

  constructor(
    @Inject('REQUEST_ID') private readonly requestId: number,
    private readonly usersService: UsersService,
  ) {
    UserByIdPipe.COUNTER++;
  }

  transform(value: string, metadata: ArgumentMetadata) {
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    UserByIdPipe.REQUEST_SCOPED_DATA.push(this.requestId);
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return this.usersService.findById(value);
  }
}
