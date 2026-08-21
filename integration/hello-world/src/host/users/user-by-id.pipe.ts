const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  transform(value: string, metadata: ArgumentMetadata) {
	logger.debug(`>>> Entering transform(value=${value},metadata=${metadata})`);
	logger.debug(`<<< Exiting transform(value=${value},metadata=${metadata})`);
    return this.usersService.findById(value);
  }
}
