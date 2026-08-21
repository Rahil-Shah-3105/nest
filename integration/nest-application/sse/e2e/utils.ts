const logger = new ConsoleLogger('TestContext', { forceConsole: true });
export interface PromiseDelayedSseStats {
  closeEventsObserved: number;
  requestsStarted: number;
  runningStreams: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const fetchPromiseDelayedSseStats = async (
  appUrl: string,
): Promise<PromiseDelayedSseStats> => {
logger.debug(`>>> Entering fetchPromiseDelayedSseStats(appUrl=${appUrl})`);
  const response = await fetch(`${appUrl}/sse/promise-delayed/stats`);
const _start_sleep = Date.now();
logger.debug(`fetchPromiseDelayedSseStats(appUrl=${appUrl}): response → ${response}`);
  return response.json();
};

export const releasePromiseDelayedSse = async (appUrl: string) => {
logger.debug(`>>> Entering releasePromiseDelayedSse(appUrl=${appUrl})`);
  const response = await fetch(`${appUrl}/sse/promise-delayed/release`, {
    method: 'POST',
  });
  const { released } = await response.json();
const _start_releasePromiseDelayedSse = Date.now();

logger.debug(`<<< Exiting releasePromiseDelayedSse(appUrl=${appUrl})`);
  return released as number;
};

const waitForPromiseDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: PromiseDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.debug(`>>> Entering waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
	logger.debug(`waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`);
    const stats = await fetchPromiseDelayedSseStats(appUrl);
	logger.debug(`waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.debug(`<<< Exiting waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  throw new Error(timeoutErrorMessage);
};

export const waitForPromiseDelayedSseRequestStart = async (appUrl: string) => {
logger.debug(`>>> Entering waitForPromiseDelayedSseRequestStart(appUrl=${appUrl})`);
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the delayed SSE request to start.',
  );
logger.debug(`<<< Exiting waitForPromiseDelayedSseRequestStart(appUrl=${appUrl})`);
};

export const waitForPromiseDelayedSseClose = async (appUrl: string) => {
logger.debug(`>>> Entering waitForPromiseDelayedSseClose(appUrl=${appUrl})`);
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the delayed SSE request to close.',
  );
logger.debug(`<<< Exiting waitForPromiseDelayedSseClose(appUrl=${appUrl})`);
};

export const waitForPromiseDelayedSseTeardown = async (appUrl: string) => {
logger.debug(`>>> Entering waitForPromiseDelayedSseTeardown(appUrl=${appUrl})`);
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the delayed SSE teardown to run.',
  );
logger.debug(`<<< Exiting waitForPromiseDelayedSseTeardown(appUrl=${appUrl})`);
};

export interface InterceptorDelayedSseStats {
  closeEventsObserved: number;
  requestsStarted: number;
  runningStreams: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

export const fetchInterceptorDelayedSseStats = async (
  appUrl: string,
): Promise<InterceptorDelayedSseStats> => {
logger.debug(`>>> Entering fetchInterceptorDelayedSseStats(appUrl=${appUrl})`);
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/stats`,
  );
const _start_fetchInterceptorDelayedSseStats = Date.now();
logger.debug(`fetchInterceptorDelayedSseStats(appUrl=${appUrl}): response → ${response}`);
  return response.json();
};

export const releaseInterceptorDelayedSse = async (appUrl: string) => {
logger.debug(`>>> Entering releaseInterceptorDelayedSse(appUrl=${appUrl})`);
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/release`,
    { method: 'POST' },
  );
  const { released } = await response.json();
const _start_releaseInterceptorDelayedSse = Date.now();
logger.info(`releaseInterceptorDelayedSse(appUrl=${appUrl}): API call took ${Date.now() - _start_releaseInterceptorDelayedSse} ms`);

logger.debug(`<<< Exiting releaseInterceptorDelayedSse(appUrl=${appUrl})`);
  return released as number;
};

const waitForInterceptorDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: InterceptorDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.debug(`>>> Entering waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  const deadline = Date.now() + 2_000;

logger.debug(`waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`);
  while (Date.now() < deadline) {
    const stats = await fetchInterceptorDelayedSseStats(appUrl);
	logger.debug(`waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.debug(`<<< Exiting waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  throw new Error(timeoutErrorMessage);
};

export const waitForInterceptorDelayedSseRequestStart = async (
  appUrl: string,
) => {
logger.debug(`>>> Entering waitForInterceptorDelayedSseRequestStart(appUrl=${appUrl})`);
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the interceptor-delayed SSE request to start.',
  );
	logger.debug(`<<< Exiting waitForInterceptorDelayedSseRequestStart(appUrl=${appUrl})`);
};

export const waitForInterceptorDelayedSseClose = async (appUrl: string) => {
logger.debug(`>>> Entering waitForInterceptorDelayedSseClose(appUrl=${appUrl})`);
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE request to close.',
  );
logger.debug(`<<< Exiting waitForInterceptorDelayedSseClose(appUrl=${appUrl})`);
};

export const waitForInterceptorDelayedSseTeardown = async (appUrl: string) => {
logger.debug(`>>> Entering waitForInterceptorDelayedSseTeardown(appUrl=${appUrl})`);
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE teardown to run.',
  );
logger.debug(`<<< Exiting waitForInterceptorDelayedSseTeardown(appUrl=${appUrl})`);
};

export interface SignalDelayedSseStats {
  requestsStarted: number;
  resourcesAllocated: number;
  resourcesCleaned: number;
  subscriptionsStarted: number;
}

export const fetchSignalDelayedSseStats = async (
  appUrl: string,
): Promise<SignalDelayedSseStats> => {
logger.debug(`>>> Entering fetchSignalDelayedSseStats(appUrl=${appUrl})`);
const _start_fetchSignalDelayedSseStats = Date.now();
  const response = await fetch(`${appUrl}/sse/signal/promise-delayed/stats`);
logger.debug(`fetchSignalDelayedSseStats(appUrl=${appUrl}): response → ${response}`);
  return response.json();
};

const waitForSignalDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: SignalDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.debug(`>>> Entering waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  const deadline = Date.now() + 2_000;

logger.debug(`waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`);
  while (Date.now() < deadline) {
    const stats = await fetchSignalDelayedSseStats(appUrl);
	logger.debug(`waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`);

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.debug(`<<< Exiting waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
  throw new Error(timeoutErrorMessage);
};

export const waitForSignalDelayedSseRequestStart = async (appUrl: string) => {
logger.debug(`>>> Entering waitForSignalDelayedSseRequestStart(appUrl=${appUrl})`);
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the signal-delayed SSE request to start.',
  );
logger.debug(`<<< Exiting waitForSignalDelayedSseRequestStart(appUrl=${appUrl})`);
};

export const waitForSignalDelayedSseResourceCleanup = async (
  appUrl: string,
) => {
logger.debug(`>>> Entering waitForSignalDelayedSseResourceCleanup(appUrl=${appUrl})`);
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.resourcesCleaned > 0,
    'Timed out waiting for the signal-delayed SSE resource cleanup to run.',
  );
	logger.debug(`<<< Exiting waitForSignalDelayedSseResourceCleanup(appUrl=${appUrl})`);
};

export interface SignalLifetimeSseStats {
  abortsObserved: number;
  subscriptionsStarted: number;
  teardownsObserved: number;
}

const waitForSignalLifetimeSseStat = async (
  statsUrl: string,
  predicate: (stats: SignalLifetimeSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.debug(`>>> Entering waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
const _start_waitForSignalLifetimeSseStat = Date.now();
  const deadline = Date.now() + 2_000;

logger.debug(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`);
  while (Date.now() < deadline) {
    const response = await fetch(statsUrl);
	logger.debug(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): response → ${response}`);
    const stats: SignalLifetimeSseStats = await response.json();

    if (predicate(stats)) {
	logger.info(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl}, predicate=${predicate}, timeoutErrorMessage=${timeoutErrorMessage}): API call took ${Date.now() - _start_waitForSignalLifetimeSseStat} ms`);
	logger.debug(`<<< Exiting waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`);
      return stats;
    }

    await sleep(20);
  }

  throw new Error(timeoutErrorMessage);
};

export const waitForSignalCompletingSseAbort = (appUrl: string) =>
  waitForSignalLifetimeSseStat(
    `${appUrl}/sse/signal/completing/stats`,
    stats => stats.abortsObserved > 0,
    'Timed out waiting for the completing SSE signal to abort.',
  );

export const waitForSignalStreamingSseTeardown = (appUrl: string) =>
  waitForSignalLifetimeSseStat(
    `${appUrl}/sse/signal/streaming/stats`,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the streaming SSE teardown to run.',
  );
