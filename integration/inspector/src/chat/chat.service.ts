const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

@Injectable()
export class ChatService {
  create(createChatDto: CreateChatDto) {
	logger.debug(`>>> Entering create(createChatDto=${createChatDto})`);
	logger.debug(`<<< Exiting create(createChatDto=${createChatDto})`);
    return 'This action adds a new chat';
  }

  findAll() {
	logger.debug('>>> Entering findAll()');
	logger.debug('<<< Exiting findAll()');
    return `This action returns all chat`;
  }

  findOne(id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
	logger.debug(`<<< Exiting findOne(id=${id})`);
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
	logger.debug(`>>> Entering update(id=${id},updateChatDto=${updateChatDto})`);
	logger.debug(`<<< Exiting update(id=${id},updateChatDto=${updateChatDto})`);
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return `This action removes a #${id} chat`;
  }
}
