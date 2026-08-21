const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Owner } from '../graphql.schema.js';

@Injectable()
export class OwnersService {
  private readonly owners: Owner[] = [{ id: 1, name: 'Jon', age: 5 }];

  findOneById(id: number): Owner | undefined {
	logger.debug(`>>> Entering findOneById(id=${id})`);
	logger.debug(`<<< Exiting findOneById(id=${id})`);
    return this.owners.find(owner => owner.id === id);
  }
}
