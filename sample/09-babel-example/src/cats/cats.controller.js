const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  Controller,
  Get,
  Post,
  Body,
  Bind,
  Dependencies,
  Param,
} from '@nestjs/common';
import { CatsService } from './cats.service.js';

@Controller('cats')
@Dependencies(CatsService)
export class CatsController {
  constructor(catsService) {
	logger.debug(`>>> Entering constructor(catsService=${catsService})`);
    this.catsService = catsService;
	logger.debug(`constructor(catsService=${catsService}): catsService → ${catsService}`);
  }

  @Post()
  @Bind(Body())
  async create(createCatDto) {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
    this.catsService.create(createCatDto);
	logger.debug(`<<< Exiting create(createCatDto=${createCatDto})`);
  }

  @Get()
  async findAll() {
	logger.debug('>>> Entering findAll()'); const __log_start = Date.now();
	logger.info(`findAll()=: find operation took ${Date.now() - __log_start} ms`);
    return this.catsService.findAll();
  }

  @Get(':id')
  @Bind(Param('id'))
  findOne(id) {
	logger.debug(`>>> Entering findOne(id=${id})`);
    // logic
	logger.debug(`<<< Exiting findOne(id=${id})`);
  }
}
