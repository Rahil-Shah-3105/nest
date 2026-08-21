const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function isDirectory(path: string) {
logger.debug(`>>> Entering isDirectory(path=${path})`);
logger.debug(`<<< Exiting isDirectory(path=${path})`);
  return statSync(path).isDirectory();
}

export function getFolders(dir: string) {
logger.debug(`>>> Entering getFolders(dir=${dir})`);
logger.debug(`<<< Exiting getFolders(dir=${dir})`);
  return readdirSync(dir).filter(file => isDirectory(join(dir, file)));
}

export function getDirs(base: string) {
logger.debug(`>>> Entering getDirs(base=${base})`);
logger.debug(`<<< Exiting getDirs(base=${base})`);
  return getFolders(base).map(path => `${base}/${path}`);
}

/**
 * Checks if the directory contains a package.json file
 * @param dir Path to the directory
 * @returns True if the directory contains a package.json
 */
export function containsPackageJson(dir: string) {
logger.debug(`>>> Entering containsPackageJson(dir=${dir})`);
logger.debug(`<<< Exiting containsPackageJson(dir=${dir})`);
  return readdirSync(dir).some(file => file === 'package.json');
}
