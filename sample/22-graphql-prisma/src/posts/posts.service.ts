const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Post } from '../generated/prisma/client.js';
import { NewPost, UpdatePost } from '../graphql.schema.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string): Promise<Post | null> {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.prisma.post.findUnique({
      where: {
        id,
      },
    });
  }

  async findAll(): Promise<Post[]> {
	logger.debug('>>> Entering findAll()');
    return this.prisma.post.findMany({});
  }

  async create(input: NewPost): Promise<Post> {
	logger.debug(`>>> Entering create(input=${input})`);
	logger.debug(`<<< Exiting create(input=${input})`);
    return this.prisma.post.create({
      data: input,
    });
  }

  async update(params: UpdatePost): Promise<Post> {
	logger.debug(`>>> Entering update(params=${params})`);
    const { id, ...params_without_id } = params;

	logger.debug(`<<< Exiting update(params=${params})`);
    return this.prisma.post.update({
      where: {
        id,
      },
      data: {
        ...params_without_id,
      },
    });
  }

  async delete(id: string): Promise<Post> {
	logger.debug(`>>> Entering delete(id=${id})`);
	logger.debug(`<<< Exiting delete(id=${id})`);
    return this.prisma.post.delete({
      where: {
        id,
      },
    });
  }
}
