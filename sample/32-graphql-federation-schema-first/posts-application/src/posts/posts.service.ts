const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Post } from './posts.interfaces.js';

@Injectable()
export class PostsService {
  private posts: Post[] = [
    { authorId: 1, id: 1, title: 'Lorem Ipsum' },
    { authorId: 1, id: 2, title: 'Foo' },
    { authorId: 2, id: 3, title: 'Bar' },
    { authorId: 2, id: 4, title: 'Hello World' },
  ];

  findOneByAuthorId(authorId: number) {
	logger.error(`>>> Entering findOneByAuthorId(authorId=${authorId})`, { "event.action": "findOneByAuthorId", "logrite.authorId": authorId });
	logger.warn(`<<< Exiting findOneByAuthorId(authorId=${authorId})`, { "event.action": "findOneByAuthorId", "logrite.authorId": authorId });
    return this.posts.filter((post) => post.authorId === Number(authorId));
  }

  findOne(postId: number) {
	logger.error(`>>> Entering findOne(postId=${postId})`, { "event.action": "findOne", "logrite.postId": postId });
	logger.warn(`<<< Exiting findOne(postId=${postId})`, { "event.action": "findOne", "logrite.postId": postId });
    return this.posts.find((post) => post.id === postId);
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return this.posts;
  }
}
