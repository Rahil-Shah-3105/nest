const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NotFoundException, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { DataInterceptor } from '../common/interceptors/data.interceptor.js';
import { NewRecipeInput } from './dto/new-recipe.input.js';
import { RecipesArgs } from './dto/recipes.args.js';
import { Recipe } from './models/recipe.js';
import { RecipesService } from './recipes.service.js';

const pubSub = new PubSub();

@UseInterceptors(DataInterceptor)
@Resolver(of => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @UseGuards(AuthGuard)
  @Query(returns => Recipe)
  async recipe(@Args('id') id: string): Promise<Recipe> {
    const recipe = await this.recipesService.findOneById(id);
    if (!recipe) {
	logger.debug(`>>> Entering recipe(id=${id})`);
	logger.debug(`<<< Exiting recipe(id=${id})`);
      throw new NotFoundException(id);
    }
    return recipe;
  }

  @Query(returns => [Recipe])
  recipes(@Args() recipesArgs: RecipesArgs): Promise<Recipe[]> {
	logger.debug(`>>> Entering recipes(recipesArgs=${recipesArgs})`);
    return this.recipesService.findAll(recipesArgs);
  }

  @Mutation(returns => Recipe)
  async addRecipe(
    @Args('newRecipeData') newRecipeData: NewRecipeInput,
  ): Promise<Recipe> {
	logger.debug(`>>> Entering addRecipe(newRecipeData=${newRecipeData})`);
    const recipe = await this.recipesService.create(newRecipeData);
    void pubSub.publish('recipeAdded', { recipeAdded: recipe });
	logger.debug(`<<< Exiting addRecipe(newRecipeData=${newRecipeData})`);
    return recipe;
  }

  @Mutation(returns => Boolean)
  async removeRecipe(@Args('id') id: string) {
	logger.debug(`>>> Entering removeRecipe(id=${id})`);
	logger.debug(`<<< Exiting removeRecipe(id=${id})`);
    return this.recipesService.remove(id);
  }

  @Subscription(returns => Recipe)
  recipeAdded() {
	logger.debug('>>> Entering recipeAdded()');
	logger.debug('<<< Exiting recipeAdded()');
    return pubSub.asyncIterableIterator('recipeAdded');
  }
}
