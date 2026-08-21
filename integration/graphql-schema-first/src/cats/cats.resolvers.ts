const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ParseIntPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { CatsGuard } from './cats.guard.js';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';

const pubSub = new PubSub();

@Resolver('Cat')
export class CatsResolvers {
  constructor(private readonly catsService: CatsService) {}

  @Query()
  @UseGuards(CatsGuard)
  async getCats() {
	logger.debug('>>> Entering getCats()');
    return this.catsService.findAll();
  }

  @Query('cat')
  async findOneById(
    @Args('id', ParseIntPipe)
    id: number,
  ): Promise<Cat> {
	logger.debug(`>>> Entering findOneById(id=${id})`);
	logger.debug(`<<< Exiting findOneById(id=${id})`);
    return this.catsService.findOneById(id);
  }

  @Mutation('createCat')
  async create(@Args() args: Cat): Promise<Cat> {
	logger.debug(`>>> Entering create(args=${args})`);
    const createdCat = this.catsService.create(args);
	logger.debug(`create(args=${args}): createdCat → ${createdCat}`);
    void pubSub.publish('catCreated', { catCreated: createdCat });
	logger.debug(`<<< Exiting create(args=${args})`);
    return createdCat;
  }

  @Subscription('catCreated')
  catCreated() {
	logger.debug('>>> Entering catCreated()');
	logger.debug('<<< Exiting catCreated()');
    return pubSub.asyncIterableIterator('catCreated');
  }
}
