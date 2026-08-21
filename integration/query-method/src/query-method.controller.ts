const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller } from '@nestjs/common';
import { QueryMethod } from '@nestjs/common';

interface SearchFilters {
  name?: string;
  page?: number;
}

@Controller('items')
export class QueryMethodController {
  @QueryMethod()
  findAll(@Body() filters: SearchFilters) {
	logger.debug(`>>> Entering findAll(filters=${filters})`);
	logger.debug(`<<< Exiting findAll(filters=${filters})`);
    return { results: [], filters };
  }

  @QueryMethod('search')
  search(@Body() filters: SearchFilters) {
	logger.debug(`>>> Entering search(filters=${filters})`);
	logger.debug(`<<< Exiting search(filters=${filters})`);
    return { endpoint: 'search', filters };
  }
}
