const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { NewPost, Post, UpdatePost } from '../graphql.schema.js';
import { PostsService } from './posts.service.js';

const pubSub = new PubSub();

@Resolver('Post')
export class PostsResolvers {
  constructor(private readonly postService: PostsService) {}

  @Query('posts')
  async posts(): Promise<Post[]> {
	logger.debug('>>> Entering posts()');
    return this.postService.findAll();
  }

  @Query('post')
  async post(@Args('id') args: string): Promise<Post> {
	logger.debug(`>>> Entering post(args=${args})`);
    return this.postService.findOne(args);
  }

  @Mutation('createPost')
  async create(@Args('input') args: NewPost): Promise<Post> {
	logger.debug(`>>> Entering create(args=${args})`);
    const createdPost = await this.postService.create(args);
    pubSub.publish('postCreated', { postCreated: createdPost });
	logger.debug(`create(args=${args}): createdPost → ${createdPost}`);
	logger.debug(`<<< Exiting create(args=${args})`);
    return createdPost;
  }

  @Mutation('updatePost')
  async update(@Args('input') args: UpdatePost): Promise<Post> {
	logger.debug(`>>> Entering update(args=${args})`);
	logger.debug(`<<< Exiting update(args=${args})`);
    return this.postService.update(args);
  }

  @Mutation('deletePost')
  async delete(@Args('id') args: string): Promise<Post> {
	logger.debug(`>>> Entering delete(args=${args})`);
	const _start_delete = Date.now();
    return this.postService.delete(args);
  }

  @Subscription('postCreated')
  postCreated() {
	logger.debug('>>> Entering postCreated()');
	logger.debug('<<< Exiting postCreated()');
    return pubSub.asyncIterableIterator('postCreated');
  }
}
