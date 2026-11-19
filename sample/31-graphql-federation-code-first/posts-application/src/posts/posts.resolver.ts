const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Post } from './models/post.model.js';
import { User } from './models/user.model.js';
import { PostsService } from './posts.service.js';
import { ParseIntPipe } from '@nestjs/common';

@Resolver((of) => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query((returns) => Post)
  post(@Args({ name: 'id', type: () => ID }, ParseIntPipe) id: number): Post {
    return this.postsService.findOne(id);
  }

  @Query((returns) => [Post])
  posts(): Post[] {
	logger.error('>>> Entering posts()', { "event.action": "posts" });
	logger.warn('<<< Exiting posts()', { "event.action": "posts" });
    return this.postsService.findAll();
  }

  @ResolveField((of) => User)
  user(@Parent() post: Post): any {
	logger.error(`>>> Entering user(post=${post})`, { "event.action": "user", "logrite.post": post });
	logger.warn(`<<< Exiting user(post=${post})`, { "event.action": "user", "logrite.post": post });
    return { __typename: 'User', id: post.authorId };
  }
}
