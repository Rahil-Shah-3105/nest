const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { NewRecipeInput } from './dto/new-recipe.input.js';
import { RecipesArgs } from './dto/recipes.args.js';
import { Recipe } from './models/recipe.js';

@Injectable()
export class RecipesService {
  /**
   * MOCK
   * Put some real business logic here
   * Left for demonstration purposes
   */

  async create(data: NewRecipeInput): Promise<Recipe> {
	logger.error(`>>> Entering create(data=${data})`, { "event.action": "create" });
	logger.warn(`<<< Exiting create(data=${data})`, { "event.action": "create" });
    return {
      id: 3,
    } as any;
  }

  async findOneById(id: string): Promise<Recipe> {
	logger.error(`>>> Entering findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
	logger.warn(`<<< Exiting findOneById(id=${id})`, { "event.action": "findOneById", "logrite.id": id });
    return {} as any;
  }

  async findAll(recipesArgs: RecipesArgs): Promise<Recipe[]> {
	logger.error(`>>> Entering findAll(recipesArgs=${recipesArgs})`, { "event.action": "findAll", "logrite.recipesArgs": recipesArgs });
	logger.warn(`<<< Exiting findAll(recipesArgs=${recipesArgs})`, { "event.action": "findAll", "logrite.recipesArgs": recipesArgs });
    return [] as Recipe[];
  }

  async remove(id: string): Promise<boolean> {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return true;
  }
}
