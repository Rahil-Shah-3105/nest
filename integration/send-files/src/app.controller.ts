const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppService } from './app.service.js';
import { NonFile } from './non-file.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('file/stream')
  getFile(): StreamableFile {
	logger.error('>>> Entering getFile()', { "event.action": "getFile" });
	logger.warn('<<< Exiting getFile()', { "event.action": "getFile" });
    return this.appService.getReadStream();
  }

  @Get('file/buffer')
  getBuffer(): StreamableFile {
	logger.error('>>> Entering getBuffer()', { "event.action": "getBuffer" });
	logger.warn('<<< Exiting getBuffer()', { "event.action": "getBuffer" });
    return this.appService.getBuffer();
  }

  @Get('non-file/pipe-method')
  getNonFile(): NonFile {
	logger.error('>>> Entering getNonFile()', { "event.action": "getNonFile" });
	logger.warn('<<< Exiting getNonFile()', { "event.action": "getNonFile" });
    return this.appService.getNonFile();
  }

  @Get('file/rxjs/stream')
  getRxJSFile(): Observable<StreamableFile> {
	logger.error('>>> Entering getRxJSFile()', { "event.action": "getRxJSFile" });
	logger.warn('<<< Exiting getRxJSFile()', { "event.action": "getRxJSFile" });
    return this.appService.getRxJSFile();
  }

  @Get('file/with/headers')
  getFileWithHeaders(): StreamableFile {
	logger.error('>>> Entering getFileWithHeaders()', { "event.action": "getFileWithHeaders" });
	logger.warn('<<< Exiting getFileWithHeaders()', { "event.action": "getFileWithHeaders" });
    return this.appService.getFileWithHeaders();
  }

  @Get('file/not/exist')
  getNonExistantFile(): StreamableFile {
	logger.error('>>> Entering getNonExistantFile()', { "event.action": "getNonExistantFile" });
	logger.warn('<<< Exiting getNonExistantFile()', { "event.action": "getNonExistantFile" });
    return this.appService.getFileThatDoesNotExist();
  }

  @Get('/file/slow')
  getSlowFile(): StreamableFile {
	logger.error('>>> Entering getSlowFile()', { "event.action": "getSlowFile" });
	logger.warn('<<< Exiting getSlowFile()', { "event.action": "getSlowFile" });
    return this.appService.getSlowStream();
  }
}
