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
	logger.error('>>> Entering posts()', { "event.action": "posts" });
	logger.warn('<<< Exiting posts()', { "event.action": "posts" });
    return this.postService.findAll();
  }

  @Query('post')
  async post(@Args('id') args: string): Promise<Post> {
	logger.error(`>>> Entering post(args=${args})`, { "event.action": "post" });
	logger.warn(`<<< Exiting post(args=${args})`, { "event.action": "post" });
    return this.postService.findOne(args);
  }

  @Mutation('createPost')
  async create(@Args('input') args: NewPost): Promise<Post> {
	logger.error(`>>> Entering create(args=${args})`, { "event.action": "create" });
    const createdPost = await this.postService.create(args);
    pubSub.publish('postCreated', { postCreated: createdPost });
	logger.error(`create(args=${args}): createdPost → ${createdPost}`, { "event.action": "create" });
	logger.warn(`<<< Exiting create(args=${args})`, { "event.action": "create" });
    return createdPost;
  }

  @Mutation('updatePost')
  async update(@Args('input') args: UpdatePost): Promise<Post> {
	logger.error(`>>> Entering update(args=${args})`, { "event.action": "update" });
	logger.warn(`<<< Exiting update(args=${args})`, { "event.action": "update" });
    return this.postService.update(args);
  }

  @Mutation('deletePost')
  async delete(@Args('id') args: string): Promise<Post> {
	logger.error(`>>> Entering delete(args=${args})`, { "event.action": "delete" });
    return this.postService.delete(args);
  }

  @Subscription('postCreated')
  postCreated() {
	logger.error('>>> Entering postCreated()', { "event.action": "postCreated" });
	logger.warn('<<< Exiting postCreated()', { "event.action": "postCreated" });
    return pubSub.asyncIterableIterator('postCreated');
  }
}
