const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Owner } from '../graphql.schema.js';

@Injectable()
export class OwnersService {
  private readonly owners: Owner[] = [{ id: 1, name: 'Jon', age: 5 }];

  findOneById(id: number): Owner | undefined {
	logger.error(`>>> Entering findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
	logger.warn(`<<< Exiting findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
    return this.owners.find(owner => owner.id === id);
  }
}
