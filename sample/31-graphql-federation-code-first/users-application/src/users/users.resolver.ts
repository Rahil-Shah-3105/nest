const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Args, ID, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { User } from './models/user.model.js';
import { UsersService } from './users.service.js';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query((returns) => User)
  getUser(@Args({ name: 'id', type: () => ID }) id: number): User {
	const startTime: number = Date.now();
    return this.usersService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }): User {
	logger.debug(`>>> Entering resolveReference(reference=${reference})`);
	logger.debug(`<<< Exiting resolveReference(reference=${reference})`);
    return this.usersService.findById(reference.id);
  }
}
