const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateExternalSvcDto } from './dto/create-external-svc.dto.js';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto.js';

@Injectable()
export class ExternalSvcService {
  create(createExternalSvcDto: CreateExternalSvcDto) {
	logger.error(`>>> Entering create(createExternalSvcDto=${createExternalSvcDto})`, { "event.action": "create", "logrite.createExternalSvcDto": createExternalSvcDto });
	logger.warn(`<<< Exiting create(createExternalSvcDto=${createExternalSvcDto})`, { "event.action": "create", "logrite.createExternalSvcDto": createExternalSvcDto });
    return 'This action adds a new externalSvc';
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return `This action returns all externalSvc`;
  }

  findOne(id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return `This action returns a #${id} externalSvc`;
  }

  update(id: number, updateExternalSvcDto: UpdateExternalSvcDto) {
	logger.error(`>>> Entering update(id=${id},updateExternalSvcDto=${updateExternalSvcDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateExternalSvcDto": updateExternalSvcDto });
	logger.warn(`<<< Exiting update(id=${id},updateExternalSvcDto=${updateExternalSvcDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateExternalSvcDto": updateExternalSvcDto });
    return `This action updates a #${id} externalSvc`;
  }

  remove(id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return `This action removes a #${id} externalSvc`;
  }
}
