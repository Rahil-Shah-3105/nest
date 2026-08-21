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
	logger.debug(`>>> Entering create(data=${data})`);
	logger.debug(`<<< Exiting create(data=${data})`);
    return {
      id: 3,
    } as any;
  }

  async findOneById(id: string): Promise<Recipe> {
	logger.debug(`>>> Entering findOneById(id=${id})`);
	logger.debug(`<<< Exiting findOneById(id=${id})`);
    return {} as any;
  }

  async findAll(recipesArgs: RecipesArgs): Promise<Recipe[]> {
	logger.debug(`>>> Entering findAll(recipesArgs=${recipesArgs})`);
	logger.debug(`<<< Exiting findAll(recipesArgs=${recipesArgs})`);
    return [] as Recipe[];
  }

  async remove(id: string): Promise<boolean> {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return true;
  }
}
