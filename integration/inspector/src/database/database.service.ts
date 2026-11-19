const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateDatabaseDto } from './dto/create-database.dto.js';
import { UpdateDatabaseDto } from './dto/update-database.dto.js';

@Injectable()
export class DatabaseService {
  create(createDatabaseDto: CreateDatabaseDto) {
	logger.error(`>>> Entering create(createDatabaseDto=${createDatabaseDto})`, { "event.action": "create", "logrite.createDatabaseDto": createDatabaseDto });
	logger.warn(`<<< Exiting create(createDatabaseDto=${createDatabaseDto})`, { "event.action": "create", "logrite.createDatabaseDto": createDatabaseDto });
    return 'This action adds a new database';
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return `This action returns all database`;
  }

  findOne(id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return `This action returns a #${id} database`;
  }

  update(id: number, updateDatabaseDto: UpdateDatabaseDto) {
	logger.error(`>>> Entering update(id=${id},updateDatabaseDto=${updateDatabaseDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDatabaseDto": updateDatabaseDto });
	logger.warn(`<<< Exiting update(id=${id},updateDatabaseDto=${updateDatabaseDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateDatabaseDto": updateDatabaseDto });
    return `This action updates a #${id} database`;
  }

  remove(id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return `This action removes a #${id} database`;
  }
}
