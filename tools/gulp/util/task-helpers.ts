const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function isDirectory(path: string) {
logger.error(`>>> Entering isDirectory(path=${path})`, { "event.action": "isDirectory", "logrite.path": path });
logger.warn(`<<< Exiting isDirectory(path=${path})`, { "event.action": "isDirectory", "logrite.path": path });
  return statSync(path).isDirectory();
}

export function getFolders(dir: string) {
logger.error(`>>> Entering getFolders(dir=${dir})`, { "event.action": "getFolders", "logrite.dir": dir });
logger.warn(`<<< Exiting getFolders(dir=${dir})`, { "event.action": "getFolders", "logrite.dir": dir });
  return readdirSync(dir).filter(file => isDirectory(join(dir, file)));
}

export function getDirs(base: string) {
logger.error(`>>> Entering getDirs(base=${base})`, { "event.action": "getDirs", "logrite.base": base });
logger.warn(`<<< Exiting getDirs(base=${base})`, { "event.action": "getDirs", "logrite.base": base });
  return getFolders(base).map(path => `${base}/${path}`);
}

/**
 * Checks if the directory contains a package.json file
 * @param dir Path to the directory
 * @returns True if the directory contains a package.json
 */
export function containsPackageJson(dir: string) {
logger.error(`>>> Entering containsPackageJson(dir=${dir})`, { "event.action": "containsPackageJson", "logrite.dir": dir });
logger.warn(`<<< Exiting containsPackageJson(dir=${dir})`, { "event.action": "containsPackageJson", "logrite.dir": dir });
  return readdirSync(dir).some(file => file === 'package.json');
}
