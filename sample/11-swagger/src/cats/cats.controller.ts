const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CatsService } from './cats.service.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './entities/cat.entity.js';

@ApiBearerAuth()
@ApiTags('cats')
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @ApiOperation({ summary: 'Create cat' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createCatDto: CreateCatDto): Promise<Cat> {
	logger.debug(`>>> Entering create(createCatDto=${createCatDto})`);
	logger.debug(`<<< Exiting create(createCatDto=${createCatDto})`);
    return this.catsService.create(createCatDto);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Cat,
  })
  findOne(@Param('id') id: string): Cat {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return this.catsService.findOne(+id);
  }
}
