const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service.js';
import { User } from './users.interfaces.js';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField('posts')
  public posts(@Parent() user: User) {
	logger.debug(`>>> Entering posts(user=${user})`);
	logger.debug(`<<< Exiting posts(user=${user})`);
    return this.postsService.findOneByAuthorId(user.id);
  }
}
