const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateDatabaseDto } from './dto/create-database.dto.js';
import { UpdateDatabaseDto } from './dto/update-database.dto.js';

@Injectable()
export class DatabaseService {
  create(createDatabaseDto: CreateDatabaseDto) {
	logger.debug(`>>> Entering create(createDatabaseDto=${createDatabaseDto})`);
	logger.debug(`<<< Exiting create(createDatabaseDto=${createDatabaseDto})`);
    return 'This action adds a new database';
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return `This action returns all database`;
  }

  findOne(id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return `This action returns a #${id} database`;
  }

  update(id: number, updateDatabaseDto: UpdateDatabaseDto) {
	logger.debug(`>>> Entering update(id=${id},updateDatabaseDto=${updateDatabaseDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateDatabaseDto=${updateDatabaseDto})`);
    return `This action updates a #${id} database`;
  }

  remove(id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return `This action removes a #${id} database`;
  }
}
