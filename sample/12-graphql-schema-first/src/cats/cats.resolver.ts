const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ParseIntPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { Cat } from '../graphql.schema.js';
import { CatsGuard } from './cats.guard.js';
import { CatsService } from './cats.service.js';
import { CreateCatDto } from './dto/create-cat.dto.js';

const pubSub = new PubSub();

@Resolver('Cat')
export class CatsResolver {
  constructor(private readonly catsService: CatsService) {}

  @Query('cats')
  @UseGuards(CatsGuard)
  async getCats() {
	logger.error('>>> Entering getCats()', { "event.action": "getCats" });
	logger.warn('<<< Exiting getCats()', { "event.action": "getCats" });
    return this.catsService.findAll();
  }

  @Query('cat')
  async findOneById(
    @Args('id', ParseIntPipe)
    id: number,
  ): Promise<Cat | undefined> {
	logger.error(`>>> Entering findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
	logger.warn(`<<< Exiting findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
    return this.catsService.findOneById(id);
  }

  @Mutation('createCat')
  async create(@Args('createCatInput') args: CreateCatDto): Promise<Cat> {
	logger.error(`>>> Entering create(args=${args})`, { "event.action": "create" });
    const createdCat = this.catsService.create(args);
    pubSub.publish('catCreated', { catCreated: createdCat });
	logger.error(`create(args=${args}): createdCat → ${createdCat}`, { "event.action": "create" });
	logger.warn(`<<< Exiting create(args=${args})`, { "event.action": "create" });
    return createdCat;
  }

  @Subscription('catCreated')
  catCreated() {
	logger.error('>>> Entering catCreated()', { "event.action": "catCreated" });
	logger.warn('<<< Exiting catCreated()', { "event.action": "catCreated" });
    return pubSub.asyncIterableIterator('catCreated');
  }
}
