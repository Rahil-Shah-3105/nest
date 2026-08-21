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
    @Context('pubsub') pubSub: PubSub,
  ): Promise<Recipe> {
	logger.debug(`>>> Entering addRecipe(newRecipeData=${newRecipeData},pubSub=${pubSub})`);
    const recipe = await this.recipesService.create(newRecipeData);
    pubSub.publish({ topic: 'recipeAdded', payload: { recipeAdded: recipe } });
	logger.debug(`<<< Exiting addRecipe(newRecipeData=${newRecipeData},pubSub=${pubSub})`);
    return recipe;
  }

  @Mutation(returns => Boolean)
  async removeRecipe(@Args('id') id: string) {
	logger.debug(`>>> Entering removeRecipe(id=${id})`);
	logger.debug(`<<< Exiting removeRecipe(id=${id})`);
    return this.recipesService.remove(id);
  }

  @Subscription(returns => Recipe)
  recipeAdded(@Context('pubsub') pubSub: PubSub) {
	logger.debug(`>>> Entering recipeAdded(pubSub=${pubSub})`);
	logger.debug(`<<< Exiting recipeAdded(pubSub=${pubSub})`);
    return pubSub.subscribe('recipeAdded');
  }
}
