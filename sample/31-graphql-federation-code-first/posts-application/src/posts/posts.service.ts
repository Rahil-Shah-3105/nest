const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Post } from './models/post.model.js';

@Injectable()
export class PostsService {
  private posts: Post[] = [
    { authorId: 1, id: 1, title: 'Lorem Ipsum' },
    { authorId: 1, id: 2, title: 'Foo' },
    { authorId: 2, id: 3, title: 'Bar' },
    { authorId: 2, id: 4, title: 'Hello World' },
  ];

  findAllByAuthorId(authorId: number): Post[] {
	logger.debug(`>>> Entering findAllByAuthorId(authorId=${authorId})`);
	logger.debug(`<<< Exiting findAllByAuthorId(authorId=${authorId})`);
    return this.posts.filter((post) => post.authorId === Number(authorId));
  }

  findOne(postId: number): Post {
	logger.debug(`>>> Entering findOne(postId=${postId})`);
	logger.debug(`<<< Exiting findOne(postId=${postId})`);
    return this.posts.find((post) => post.id === postId);
  }

  findAll(): Post[] {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return this.posts;
  }
}
