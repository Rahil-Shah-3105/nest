const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Catch(WsException)
export class RequestFilter implements ExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
	logger.error(`>>> Entering catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const wsCtx = host.switchToWs();
	logger.error(`Exception in catch(exception=${exception},host=${host}): ${(exception as Error).message}`, exception, { "event.action": "catch", "event.category": "process", "logrite.exception": exception, "logrite.host": host });
	logger.error(`catch(exception=${exception},host=${host}): wsCtx → ${wsCtx}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    const pattern = wsCtx.getPattern();
    const client = wsCtx.getClient();
	logger.error(`catch(exception=${exception},host=${host}): pattern → ${pattern}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
	logger.error(`catch(exception=${exception},host=${host}): client → ${client}`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
    client.emit('exception', { pattern, message: exception.message });
	logger.warn(`<<< Exiting catch(exception=${exception},host=${host})`, { "event.action": "catch", "logrite.exception": exception, "logrite.host": host });
  }
}
