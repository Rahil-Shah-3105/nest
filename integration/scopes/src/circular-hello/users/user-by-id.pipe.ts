const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor(private readonly usersService: UsersService) {
	logger.debug(`>>> Entering constructor(UsersService=${UsersService})`);
    UserByIdPipe.COUNTER++;
	logger.debug(`<<< Exiting constructor(UsersService=${UsersService})`);
  }

  transform(value: string, metadata: ArgumentMetadata) {
	logger.debug(`>>> Entering transform(value=${value},metadata=${metadata})`);
	logger.debug(`<<< Exiting transform(value=${value},metadata=${metadata})`);
    return this.usersService.findById(value);
  }
}
