const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Post } from './models/post.model.js';
import { User } from './models/user.model.js';
import { PostsService } from './posts.service.js';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField((of) => [Post])
  public posts(@Parent() user: User): Post[] {
	logger.debug(`>>> Entering posts(user=${user})`);
	logger.debug(`<<< Exiting posts(user=${user})`);
    return this.postsService.findAllByAuthorId(user.id);
  }
}
