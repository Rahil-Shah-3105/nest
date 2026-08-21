const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

@WebSocketGateway()
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('createChat')
  create(@MessageBody() createChatDto: CreateChatDto) {
	logger.debug(`>>> Entering create(createChatDto=${createChatDto})`);
	logger.debug(`<<< Exiting create(createChatDto=${createChatDto})`);
    return this.chatService.create(createChatDto);
  }

  @SubscribeMessage('findAllChat')
  findAll() {
	logger.debug('>>> Entering findAll()');
    return this.chatService.findAll();
  }

  @SubscribeMessage('findOneChat')
  findOne(@MessageBody() id: number) {
	logger.debug(`>>> Entering findOne(id=${id})`);
    return this.chatService.findOne(id);
  }

  @SubscribeMessage('updateChat')
  update(@MessageBody() updateChatDto: UpdateChatDto) {
	logger.debug(`>>> Entering update(updateChatDto=${updateChatDto})`);
	logger.debug(`<<< Exiting update(updateChatDto=${updateChatDto})`);
    return this.chatService.update(updateChatDto.id, updateChatDto);
  }

  @SubscribeMessage('removeChat')
  remove(@MessageBody() id: number) {
	logger.debug(`>>> Entering remove(id=${id})`);
	logger.debug(`<<< Exiting remove(id=${id})`);
    return this.chatService.remove(id);
  }
}
