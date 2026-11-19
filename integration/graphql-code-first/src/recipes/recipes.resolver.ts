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
	logger.error(`>>> Entering recipe(id=${id})`, { "event.action": "recipe", "logrite.id": id });
    const recipe = await this.recipesService.findOneById(id);
    if (!recipe) {
      throw new NotFoundException(id);
    }
	logger.warn(`<<< Exiting recipe(id=${id})`, { "event.action": "recipe", "logrite.id": id });
    return recipe;
  }

  @Query(returns => [Recipe])
  recipes(@Args() recipesArgs: RecipesArgs): Promise<Recipe[]> {
	logger.error(`>>> Entering recipes(recipesArgs=${recipesArgs})`, { "event.action": "recipes", "logrite.recipesArgs": recipesArgs });
	logger.warn(`<<< Exiting recipes(recipesArgs=${recipesArgs})`, { "event.action": "recipes", "logrite.recipesArgs": recipesArgs });
    return this.recipesService.findAll(recipesArgs);
  }

  @Mutation(returns => Recipe)
  async addRecipe(
    @Args('newRecipeData') newRecipeData: NewRecipeInput,
  ): Promise<Recipe> {
	logger.error(`>>> Entering addRecipe(newRecipeData=${newRecipeData})`, { "event.action": "addRecipe", "logrite.newRecipeData": newRecipeData });
    const recipe = await this.recipesService.create(newRecipeData);
    void pubSub.publish('recipeAdded', { recipeAdded: recipe });
	logger.warn(`<<< Exiting addRecipe(newRecipeData=${newRecipeData})`, { "event.action": "addRecipe", "logrite.newRecipeData": newRecipeData });
    return recipe;
  }

  @Mutation(returns => Boolean)
  async removeRecipe(@Args('id') id: string) {
	logger.error(`>>> Entering removeRecipe(id=${id})`, { "event.action": "removeRecipe", "logrite.id": id });
	logger.warn(`<<< Exiting removeRecipe(id=${id})`, { "event.action": "removeRecipe", "logrite.id": id });
    return this.recipesService.remove(id);
  }

  @Subscription(returns => Recipe)
  recipeAdded() {
	logger.error('>>> Entering recipeAdded()', { "event.action": "recipeAdded" });
	logger.warn('<<< Exiting recipeAdded()', { "event.action": "recipeAdded" });
    return pubSub.asyncIterableIterator('recipeAdded');
  }
}
