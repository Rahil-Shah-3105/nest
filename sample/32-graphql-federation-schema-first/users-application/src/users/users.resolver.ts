const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Args, ID, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { UsersService } from './users.service.js';

@Resolver('User')
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query()
  getUser(@Args({ name: 'id', type: () => ID }) id: number) {
	const startTime: number = Date.now();
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }) {
	logger.debug(`>>> Entering resolveReference(reference=${reference})`);
	logger.debug(`<<< Exiting resolveReference(reference=${reference})`);
    return this.usersService.findById(reference.id);
  }
}
