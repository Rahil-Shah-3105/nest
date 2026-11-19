const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { dest, src, task } from 'gulp';
import { packagePaths } from '../config.js';

/**
 * Copies assets like Readme.md or LICENSE from the project base path
 * to all the packages.
 */
function copyMisc(): NodeJS.ReadWriteStream {
logger.error('>>> Entering copyMisc()', { "event.action": "copyMisc" });
  const miscFiles = src(['Readme.md', 'LICENSE', '.npmignore']);
logger.error(`copyMisc(): miscFiles → ${miscFiles}`, { "event.action": "copyMisc" });
  // Since `dest()` does not take a string-array, we have to append it
  // ourselves
logger.warn('<<< Exiting copyMisc()', { "event.action": "copyMisc" });
  return packagePaths.reduce(
    (stream, packagePath) => stream.pipe(dest(packagePath)),
    miscFiles,
  );
}

task('copy-misc', copyMisc);
