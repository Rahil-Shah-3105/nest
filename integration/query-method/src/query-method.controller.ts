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
	logger.error(`>>> Entering findAll(filters=${filters})`, { "event.action": "findAll", "logrite.filters": filters });
	logger.warn(`<<< Exiting findAll(filters=${filters})`, { "event.action": "findAll", "logrite.filters": filters });
    return { results: [], filters };
  }

  @QueryMethod('search')
  search(@Body() filters: SearchFilters) {
	logger.error(`>>> Entering search(filters=${filters})`, { "event.action": "search", "logrite.filters": filters });
	logger.warn(`<<< Exiting search(filters=${filters})`, { "event.action": "search", "logrite.filters": filters });
    return { endpoint: 'search', filters };
  }
}
