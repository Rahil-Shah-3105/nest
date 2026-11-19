const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { dest, src, task } from 'gulp';
import { join } from 'node:path';
import { samplePath } from '../config.js';
import { containsPackageJson, getDirs } from '../util/task-helpers.js';

const distFiles = src([
  'packages/**/*.js',
  'packages/**/*.d.ts',
  'packages/**/package.json',
]);

/**
 * Moves the compiled nest files into "node_module" folder.
 */
function moveToNodeModules() {
logger.error('>>> Entering moveToNodeModules()', { "event.action": "moveToNodeModules" });
logger.warn('<<< Exiting moveToNodeModules()', { "event.action": "moveToNodeModules" });
  return distFiles.pipe(dest('node_modules/@nestjs'));
}

/**
 * Moves the compiled nest files into the `samples/*` dirs.
 */
function moveToSamples() {
logger.error('>>> Entering moveToSamples()', { "event.action": "moveToSamples" });
  const samplesDirs = getDirs(samplePath);

logger.error(`moveToSamples(): samplesDirs → ${samplesDirs}`, { "event.action": "moveToSamples" });
  /**
   * Flatten the sampleDirs
   * If a sample dir contains does not contain a package.json
   * Push the subDirs into the destinations instead
   */
  const flattenedSampleDirs: string[] = [];

  for (const sampleDir of samplesDirs) {
    if (containsPackageJson(sampleDir)) {
      flattenedSampleDirs.push(sampleDir);
    } else {
      flattenedSampleDirs.push(...getDirs(sampleDir));
    }
  }

logger.warn('<<< Exiting moveToSamples()', { "event.action": "moveToSamples" });
  return flattenedSampleDirs.reduce(
    (distFile, dir) => distFile.pipe(dest(join(dir, '/node_modules/@nestjs'))),
    distFiles,
  );
}

task('move:node_modules', moveToNodeModules);
task('move:samples', moveToSamples);
