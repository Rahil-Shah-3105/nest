const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { Post } from '../generated/prisma/client.js';
import { NewPost, UpdatePost } from '../graphql.schema.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string): Promise<Post | null> {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return this.prisma.post.findUnique({
      where: {
        id,
      },
    });
  }

  async findAll(): Promise<Post[]> {
	const startTime: number = Date.now();
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
    return this.prisma.post.findMany({});
  }

  async create(input: NewPost): Promise<Post> {
	logger.error(`>>> Entering create(input=${input})`, { "event.action": "create" });
    return this.prisma.post.create({
      data: input,
    });
  }

  async update(params: UpdatePost): Promise<Post> {
	logger.error(`>>> Entering update(params=${params})`, { "event.action": "update" });
    const { id, ...params_without_id } = params;

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
	logger.error(`>>> Entering delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
	logger.warn(`<<< Exiting delete(id=${id})`, { "event.action": "delete", "logrite.id": id });
    return this.prisma.post.delete({
      where: {
        id,
      },
    });
  }
}
