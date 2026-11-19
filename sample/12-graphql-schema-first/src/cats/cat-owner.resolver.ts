const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Cat, Owner } from '../graphql.schema.js';
import { OwnersService } from '../owners/owners.service.js';

@Resolver('Cat')
export class CatOwnerResolver {
  constructor(private readonly ownersService: OwnersService) {}

  @ResolveField()
  async owner(
    @Parent() cat: Cat & { ownerId: number },
  ): Promise<Owner | undefined> {
	logger.error(`>>> Entering owner(cat=${cat})`, { "event.action": "owner", "logrite.cat": cat });
	logger.warn(`<<< Exiting owner(cat=${cat})`, { "event.action": "owner", "logrite.cat": cat });
    return this.ownersService.findOneById(cat.ownerId);
  }
}
