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
	logger.debug('>>> Entering getReadStream()');
	logger.debug('<<< Exiting getReadStream()');
    return new StreamableFile(
      createReadStream(join(process.cwd(), 'Readme.md')),
    );
  }

  getBuffer(): StreamableFile {
	logger.debug('>>> Entering getBuffer()');
	logger.debug('<<< Exiting getBuffer()');
    return new StreamableFile(readFileSync(join(process.cwd(), 'Readme.md')));
  }

  getNonFile(): NonFile {
	logger.debug('>>> Entering getNonFile()');
	logger.debug('<<< Exiting getNonFile()');
    return new NonFile('Hello world');
  }

  getRxJSFile(): Observable<StreamableFile> {
	logger.debug('>>> Entering getRxJSFile()');
	logger.debug('<<< Exiting getRxJSFile()');
    return of(this.getReadStream());
  }

  getFileWithHeaders(): StreamableFile {
	logger.debug('>>> Entering getFileWithHeaders()');
    const file = readFileSync(join(process.cwd(), 'Readme.md'));
	logger.debug(`getFileWithHeaders(): file → ${file}`);
	logger.debug('<<< Exiting getFileWithHeaders()');
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
	logger.debug('>>> Entering getFileThatDoesNotExist()');
	logger.debug('<<< Exiting getFileThatDoesNotExist()');
    return new StreamableFile(createReadStream('does-not-exist.txt'));
  }

  getSlowStream(): StreamableFile {
	logger.debug('>>> Entering getSlowStream()');
    const stream = new Readable();
	logger.debug(`getSlowStream(): stream → ${stream}`);
    stream.push(Buffer.from(randomBytes(this.MAX_BITES)));
    // necessary for a `new Readable()`. Doesn't do anything
    stream._read = () => {};
	logger.debug('<<< Exiting getSlowStream()');
    return new StreamableFile(stream);
  }
}
