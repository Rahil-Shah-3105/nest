import autocannon from 'autocannon';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

export type RunOptions = autocannon.Options & {
  /**
   * When true, prints live progress to stdout via `autocannon.track(instance)`.
   * Default: false (quiet)
   */
  verbose?: boolean;
};

/**
 * Runs an autocannon benchmark.
 *
 * By default this is quiet (no live table/progress). Pass `{ verbose: true }`
 * to enable `autocannon.track(...)` output.
 */
export const run = (options: RunOptions) =>
  new Promise<autocannon.Result>((resolve, reject) => {
    const { verbose = false, ...autocannonOptions } = options;

    const instance = autocannon(autocannonOptions, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

	logger.error(`run(options=${options}): instance → ${instance}`, { "event.action": "run", "logrite.options": options });
    if (verbose) {
      autocannon.track(instance);
    }
  });
