const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { NewRecipeInput } from './dto/new-recipe.input.js';
import { RecipesArgs } from './dto/recipes.args.js';
import { Recipe } from './models/recipe.model.js';
import { RecipesService } from './recipes.service.js';

@Resolver(of => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

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
    @Context('pubsub') pubSub: PubSub,
  ): Promise<Recipe> {
	logger.error(`>>> Entering addRecipe(newRecipeData=${newRecipeData},pubSub=${pubSub})`, { "event.action": "addRecipe", "logrite.newRecipeData": newRecipeData, "logrite.pubSub": pubSub });
    const recipe = await this.recipesService.create(newRecipeData);
    pubSub.publish({ topic: 'recipeAdded', payload: { recipeAdded: recipe } });
	logger.warn(`<<< Exiting addRecipe(newRecipeData=${newRecipeData},pubSub=${pubSub})`, { "event.action": "addRecipe", "logrite.newRecipeData": newRecipeData, "logrite.pubSub": pubSub });
    return recipe;
  }

  @Mutation(returns => Boolean)
  async removeRecipe(@Args('id') id: string) {
	logger.error(`>>> Entering removeRecipe(id=${id})`, { "event.action": "removeRecipe", "logrite.id": id });
	logger.warn(`<<< Exiting removeRecipe(id=${id})`, { "event.action": "removeRecipe", "logrite.id": id });
    return this.recipesService.remove(id);
  }

  @Subscription(returns => Recipe)
  recipeAdded(@Context('pubsub') pubSub: PubSub) {
	logger.error(`>>> Entering recipeAdded(pubSub=${pubSub})`, { "event.action": "recipeAdded", "logrite.pubSub": pubSub });
	logger.warn(`<<< Exiting recipeAdded(pubSub=${pubSub})`, { "event.action": "recipeAdded", "logrite.pubSub": pubSub });
    return pubSub.subscribe('recipeAdded');
  }
}
