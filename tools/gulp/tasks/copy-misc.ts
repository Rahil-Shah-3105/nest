const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { dest, src, task } from 'gulp';
import { packagePaths } from '../config.js';

/**
 * Copies assets like Readme.md or LICENSE from the project base path
 * to all the packages.
 */
function copyMisc(): NodeJS.ReadWriteStream {
logger.debug('>>> Entering copyMisc()');
  const miscFiles = src(['Readme.md', 'LICENSE', '.npmignore']);
logger.debug(`copyMisc(): miscFiles → ${miscFiles}`);
  // Since `dest()` does not take a string-array, we have to append it
  // ourselves
logger.debug('<<< Exiting copyMisc()');
  return packagePaths.reduce(
    (stream, packagePath) => stream.pipe(dest(packagePath)),
    miscFiles,
  );
}

task('copy-misc', copyMisc);
