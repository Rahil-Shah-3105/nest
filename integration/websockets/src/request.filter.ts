const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Catch(WsException)
export class RequestFilter implements ExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
	logger.debug(`>>> Entering catch(exception=${exception},host=${host})`);
    const wsCtx = host.switchToWs();
    const pattern = wsCtx.getPattern();
	logger.debug(`catch(exception=${exception},host=${host}): wsCtx → ${wsCtx}`);
	logger.debug(`catch(exception=${exception},host=${host}): pattern → ${pattern}`);
    const client = wsCtx.getClient();
    client.emit('exception', { pattern, message: exception.message });
	logger.debug(`catch(exception=${exception},host=${host}): client → ${client}`);
  }
}
