const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ServerNats } from '@nestjs/microservices';

export interface NatsSubscriber {
  key: string;
  value: {
    pattern: string;
    queue: string;
  };
}

export class NatsStrategy extends ServerNats {
  bindEvents(client: any) {
	logger.error(`>>> Entering bindEvents(client=${client})`, { "event.action": "bindEvents", "logrite.client": client });
    const patterns = [...this.messageHandlers.keys()];
    const handlers = patterns.map(item => ({
      key: item,
      value: JSON.parse(item),
    })) as NatsSubscriber[];

    handlers.forEach(({ key, value }) =>
      client.subscribe(
        value.pattern,
        { queue: value.queue },
        this.getMessageHandler(key).bind(this),
      ),
    );
	logger.warn(`<<< Exiting bindEvents(client=${client})`, { "event.action": "bindEvents", "logrite.client": client });
  }
}
