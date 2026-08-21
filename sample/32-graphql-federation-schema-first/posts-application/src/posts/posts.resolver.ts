const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Post } from './posts.interfaces.js';
import { PostsService } from './posts.service.js';

@Resolver('Post')
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query('findPost')
  findPost(@Args({ name: 'id', type: () => ID }) id: number) {
	const startTime: number = Date.now();
    return this.postsService.findOne(id);
  }

  @Query('getPosts')
  getPosts() {
	logger.debug('>>> Entering getPosts()');
    return this.postsService.findAll();
  }

  @ResolveField('user')
  user(@Parent() post: Post): any {
	logger.debug(`>>> Entering user(post=${post})`);
	logger.debug(`<<< Exiting user(post=${post})`);
    return { __typename: 'User', id: post.authorId };
  }
}
