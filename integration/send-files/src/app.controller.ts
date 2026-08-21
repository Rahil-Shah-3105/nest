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
	logger.debug('>>> Entering getFile()');
	logger.debug('<<< Exiting getFile()');
    return this.appService.getReadStream();
  }

  @Get('file/buffer')
  getBuffer(): StreamableFile {
	logger.debug('>>> Entering getBuffer()');
	logger.debug('<<< Exiting getBuffer()');
    return this.appService.getBuffer();
  }

  @Get('non-file/pipe-method')
  getNonFile(): NonFile {
	logger.debug('>>> Entering getNonFile()');
	logger.debug('<<< Exiting getNonFile()');
    return this.appService.getNonFile();
  }

  @Get('file/rxjs/stream')
  getRxJSFile(): Observable<StreamableFile> {
	logger.debug('>>> Entering getRxJSFile()');
	logger.debug('<<< Exiting getRxJSFile()');
    return this.appService.getRxJSFile();
  }

  @Get('file/with/headers')
  getFileWithHeaders(): StreamableFile {
	logger.debug('>>> Entering getFileWithHeaders()');
	logger.debug('<<< Exiting getFileWithHeaders()');
    return this.appService.getFileWithHeaders();
  }

  @Get('file/not/exist')
  getNonExistantFile(): StreamableFile {
	logger.debug('>>> Entering getNonExistantFile()');
	logger.debug('<<< Exiting getNonExistantFile()');
    return this.appService.getFileThatDoesNotExist();
  }

  @Get('/file/slow')
  getSlowFile(): StreamableFile {
	logger.debug('>>> Entering getSlowFile()');
	logger.debug('<<< Exiting getSlowFile()');
    return this.appService.getSlowStream();
  }
}
