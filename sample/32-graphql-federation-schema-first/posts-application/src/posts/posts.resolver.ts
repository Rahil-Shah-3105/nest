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
    return this.postsService.findOne(id);
  }

  @Query('getPosts')
  getPosts() {
	logger.error('>>> Entering getPosts()', { "event.action": "getPosts" });
	logger.warn('<<< Exiting getPosts()', { "event.action": "getPosts" });
    return this.postsService.findAll();
  }

  @ResolveField('user')
  user(@Parent() post: Post): any {
	logger.error(`>>> Entering user(post=${post})`, { "event.action": "user", "logrite.post": post });
	logger.warn(`<<< Exiting user(post=${post})`, { "event.action": "user", "logrite.post": post });
    return { __typename: 'User', id: post.authorId };
  }
}
