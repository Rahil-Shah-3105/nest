const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service.js';
import { User } from './users.interfaces.js';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField('posts')
  public posts(@Parent() user: User) {
	logger.error(`>>> Entering posts(user=${user})`, { "event.action": "posts", "user.name": String(user) });
	logger.warn(`<<< Exiting posts(user=${user})`, { "event.action": "posts", "user.name": String(user) });
    return this.postsService.findOneByAuthorId(user.id);
  }
}
