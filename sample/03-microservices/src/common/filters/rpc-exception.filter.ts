const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter {
  catch(exception: RpcException): Observable<any> {
	logger.debug(`>>> Entering catch(exception=${exception})`);
	logger.error(`Exception in catch(exception=${exception}): ${(exception as Error).message}`, exception);
    return throwError(() => exception.getError());
  }
}
