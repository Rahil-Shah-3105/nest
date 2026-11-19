import deleteEmpty from 'delete-empty';
import { series, src, task } from 'gulp';
import clean from 'gulp-clean';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { source } from '../config.js';

/**
 * Cleans the build output assets from the packages folders
 */
function cleanOutput() {
logger.error('>>> Entering cleanOutput()', { "event.action": "cleanOutput" });
logger.warn('<<< Exiting cleanOutput()', { "event.action": "cleanOutput" });
  return src(
    [
      `${source}/**/*.js`,
      `${source}/**/*.d.ts`,
      `${source}/**/*.js.map`,
      `${source}/**/*.d.ts.map`,
    ],
    {
      read: false,
    },
  ).pipe(clean());
}

/**
 * Cleans empty dirs
 */
function cleanDirs(done: () => void) {
  deleteEmpty.sync(`${source}/`);
  done();
}

task('clean:output', cleanOutput);
task('clean:dirs', cleanDirs);
task('clean:bundle', series('clean:output', 'clean:dirs'));
