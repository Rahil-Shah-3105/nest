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
	const startTime: number = Date.now();
    return this.postsService.findOne(id);
  }

  @Query((returns) => [Post])
  posts(): Post[] {
	logger.debug('>>> Entering posts()');
    return this.postsService.findAll();
  }

  @ResolveField((of) => User)
  user(@Parent() post: Post): any {
	logger.debug(`>>> Entering user(post=${post})`);
	logger.debug(`<<< Exiting user(post=${post})`);
    return { __typename: 'User', id: post.authorId };
  }
}
