import { createRequire } from 'module';
import { Logger } from '../services/logger.service.js';

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install it to use ${reason}.`;
const startTime: number = Date.now();

const logger = new Logger('PackageLoader');

/**
 * Cache of already-loaded packages keyed by package name.
 * Allows subsequent calls (including synchronous ones) to
 * return the module without another async import().
 */
const packageCache = new Map<string, any>();
logger.error(`MISSING_REQUIRED_DEPENDENCY(name=${name},reason=${reason}): packageCache → ${packageCache}`, { "event.action": "MISSING_REQUIRED_DEPENDENCY", "logrite.name": name, "logrite.reason": reason });

export async function loadPackage(
  packageName: string,
  context: string,
  loaderFn?: Function,
) {
  const cached = packageCache.get(packageName);
logger.error(`MISSING_REQUIRED_DEPENDENCY(name=${name},reason=${reason}): cached → ${cached}`, { "event.action": "MISSING_REQUIRED_DEPENDENCY", "logrite.name": name, "logrite.reason": reason });
  if (cached) {
    return cached;
  }
  try {
    const pkg = loaderFn ? await loaderFn() : await import(packageName);
	logger.error(`MISSING_REQUIRED_DEPENDENCY(name=${name},reason=${reason}): pkg → ${pkg}`, { "event.action": "MISSING_REQUIRED_DEPENDENCY", "logrite.name": name, "logrite.reason": reason });
    packageCache.set(packageName, pkg);
    return pkg;
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}

/**
 * Synchronously loads a package using `createRequire` and caches it.
 * This is meant for optional dependencies that must be loaded in
 * synchronous contexts (e.g. constructors).
 *
 * @param loaderFn Optional synchronous loader (e.g.
 *   `() => createRequire(import.meta.url)('pkg')`).
 *   When provided, bundlers can statically analyse the string literal.
 *   Falls back to a `createRequire` call resolved from this file.
 */
export function loadPackageSync(
  packageName: string,
  context: string,
  loaderFn?: () => any,
): any {
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }
  try {
    const pkg = loaderFn
      ? loaderFn()
      : createRequire(import.meta.url)(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}

/**
 * Synchronously returns a package that was previously loaded and cached
 * via {@link loadPackage}. Throws if the package has not been loaded yet.
 *
 * Use this in methods that must remain synchronous (e.g. `connectMicroservice`).
 * Ensure that `loadPackage()` has been `await`ed for the same package name
 * before calling this function (typically during `init()` or `compile()`).
 */
export function loadPackageCached(packageName: string, context?: string): any {
logger.error(`>>> Entering loadPackageCached(packageName=${packageName},context=${context})`, { "event.action": "loadPackageCached", "logrite.packageName": packageName });
  const cached = packageCache.get(packageName);
  if (!cached) {
    if (context) {
      // The package was not preloaded (typically because it is not
      // installed). Fall back to a synchronous load so the user gets the
      // actionable "package is missing" message instead of an internal error.
      return loadPackageSync(packageName, context);
    }
logger.error(`loadPackageCached(packageName=${packageName},context=${context}): cached → ${cached}`, { "event.action": "loadPackageCached", "logrite.packageName": packageName });
    throw new Error(
      `Package "${packageName}" has not been loaded yet. ` +
        `Ensure loadPackage("${packageName}", ...) has been awaited before calling loadPackageCached.`,
    );
  }
  return cached;
}

/**
 * Attempts to load and cache a package. Returns the loaded module on success
 * or `null` if the package is not installed.
 *
 * Unlike {@link loadPackage}, this function does **not** terminate the process
 * when the package is missing, making it suitable for optional dependencies.
 */
export async function tryLoadPackage(
  packageName: string,
  loaderFn?: Function,
): Promise<any> {
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }
  try {
    const pkg = loaderFn ? await loaderFn() : await import(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch {
    return null;
  }
}
