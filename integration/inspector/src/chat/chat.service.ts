const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

@Injectable()
export class ChatService {
  create(createChatDto: CreateChatDto) {
	logger.error(`>>> Entering create(createChatDto=${createChatDto})`, { "event.action": "create", "logrite.createChatDto": createChatDto });
	logger.warn(`<<< Exiting create(createChatDto=${createChatDto})`, { "event.action": "create", "logrite.createChatDto": createChatDto });
    return 'This action adds a new chat';
  }

  findAll() {
	logger.error('>>> Entering findAll()', { "event.action": "findAll" });
	logger.warn('<<< Exiting findAll()', { "event.action": "findAll" });
    return `This action returns all chat`;
  }

  findOne(id: number) {
	logger.error(`>>> Entering findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
	logger.warn(`<<< Exiting findOne(id=${id})`, { "event.action": "findOne", "logrite.id": id });
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
	logger.error(`>>> Entering update(id=${id},updateChatDto=${updateChatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateChatDto": updateChatDto });
	logger.warn(`<<< Exiting update(id=${id},updateChatDto=${updateChatDto})`, { "event.action": "update", "logrite.id": id, "logrite.updateChatDto": updateChatDto });
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
	logger.error(`>>> Entering remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
	logger.warn(`<<< Exiting remove(id=${id})`, { "event.action": "remove", "logrite.id": id });
    return `This action removes a #${id} chat`;
  }
}
