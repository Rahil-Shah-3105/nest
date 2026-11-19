const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  transform(value: string, metadata: ArgumentMetadata) {
	logger.error(`>>> Entering transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
	logger.warn(`<<< Exiting transform(value=${value},metadata=${metadata})`, { "event.action": "transform", "logrite.value": value, "logrite.metadata": metadata });
    return this.usersService.findById(value);
  }
}
