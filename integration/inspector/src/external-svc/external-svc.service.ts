const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateExternalSvcDto } from './dto/create-external-svc.dto.js';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto.js';

@Injectable()
export class ExternalSvcService {
  create(createExternalSvcDto: CreateExternalSvcDto) {
	logger.debug(`>>> Entering create(createExternalSvcDto=${createExternalSvcDto})`);
	logger.debug(`<<< Exiting create(createExternalSvcDto=${createExternalSvcDto})`);
    return 'This action adds a new externalSvc';
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return `This action returns all externalSvc`;
  }

  findOne(id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return `This action returns a #${id} externalSvc`;
  }

  update(id: number, updateExternalSvcDto: UpdateExternalSvcDto) {
	logger.debug(`>>> Entering update(id=${id},updateExternalSvcDto=${updateExternalSvcDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateExternalSvcDto=${updateExternalSvcDto})`);
    return `This action updates a #${id} externalSvc`;
  }

  remove(id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return `This action removes a #${id} externalSvc`;
  }
}
