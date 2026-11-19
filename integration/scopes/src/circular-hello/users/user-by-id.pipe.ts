const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor(private readonly usersService: UsersService) {
	logger.error(`>>> Entering constructor(usersService=${usersService})`, { "event.action": "constructor", "logrite.usersService": usersService });
    UserByIdPipe.COUNTER++;
	logger.warn(`<<< Exiting constructor(usersService=${usersService})`, { "event.action": "constructor", "logrite.usersService": usersService });
  }

  transform(value: string, metadata: ArgumentMetadata) {
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return this.usersService.findById(value);
  }
}
