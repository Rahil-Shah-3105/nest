const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Injectable, StreamableFile } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';
import { Readable } from 'stream';
import { NonFile } from './non-file.js';

@Injectable()
export class AppService {
  // `randomBytes` has a max value of 2^31 -1. That's all this is
  private readonly MAX_BITES = Math.pow(2, 31) - 1;

  getReadStream(): StreamableFile {
	logger.error('>>> Entering getReadStream()', { "event.action": "getReadStream" });
	logger.warn('<<< Exiting getReadStream()', { "event.action": "getReadStream" });
    return new StreamableFile(
      createReadStream(join(process.cwd(), 'Readme.md')),
    );
  }

  getBuffer(): StreamableFile {
	logger.error('>>> Entering getBuffer()', { "event.action": "getBuffer" });
	logger.warn('<<< Exiting getBuffer()', { "event.action": "getBuffer" });
    return new StreamableFile(readFileSync(join(process.cwd(), 'Readme.md')));
  }

  getNonFile(): NonFile {
	logger.error('>>> Entering getNonFile()', { "event.action": "getNonFile" });
	logger.warn('<<< Exiting getNonFile()', { "event.action": "getNonFile" });
    return new NonFile('Hello world');
  }

  getRxJSFile(): Observable<StreamableFile> {
	logger.error('>>> Entering getRxJSFile()', { "event.action": "getRxJSFile" });
	logger.warn('<<< Exiting getRxJSFile()', { "event.action": "getRxJSFile" });
    return of(this.getReadStream());
  }

  getFileWithHeaders(): StreamableFile {
	logger.error('>>> Entering getFileWithHeaders()', { "event.action": "getFileWithHeaders" });
    const file = readFileSync(join(process.cwd(), 'Readme.md'));
	logger.warn('<<< Exiting getFileWithHeaders()', { "event.action": "getFileWithHeaders" });
    return new StreamableFile(
      createReadStream(join(process.cwd(), 'Readme.md')),
      {
        type: 'text/markdown',
        disposition: 'attachment; filename="Readme.md"',
        length: file.byteLength,
      },
    );
  }

  getFileThatDoesNotExist(): StreamableFile {
	logger.error('>>> Entering getFileThatDoesNotExist()', { "event.action": "getFileThatDoesNotExist" });
	logger.warn('<<< Exiting getFileThatDoesNotExist()', { "event.action": "getFileThatDoesNotExist" });
    return new StreamableFile(createReadStream('does-not-exist.txt'));
  }

  getSlowStream(): StreamableFile {
	logger.error('>>> Entering getSlowStream()', { "event.action": "getSlowStream" });
    const stream = new Readable();
    stream.push(Buffer.from(randomBytes(this.MAX_BITES)));
	logger.error(`getSlowStream(): stream → ${stream}`, { "event.action": "getSlowStream" });
    // necessary for a `new Readable()`. Doesn't do anything
    stream._read = () => {};
	logger.warn('<<< Exiting getSlowStream()', { "event.action": "getSlowStream" });
    return new StreamableFile(stream);
  }
}
