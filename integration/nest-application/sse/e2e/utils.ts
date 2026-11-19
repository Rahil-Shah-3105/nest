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
const _start_sleep_10 = Date.now();
logger.error(`>>> Entering fetchPromiseDelayedSseStats(appUrl=${appUrl})`, { "event.action": "fetchPromiseDelayedSseStats", "logrite.appUrl": appUrl });
const _start_fetchPromiseDelayedSseStats_13 = Date.now();
  const response = await fetch(`${appUrl}/sse/promise-delayed/stats`);
logger.error(`fetchPromiseDelayedSseStats(appUrl=${appUrl}): response → ${response}`, { "event.action": "fetchPromiseDelayedSseStats", "logrite.appUrl": appUrl });
logger.error(`sleep(ms=${ms}): API call took ${Date.now() - _start_sleep_10} ms`, { "event.action": "sleep", "event.category": "network", "logrite.ms": ms });
logger.error(`fetchPromiseDelayedSseStats(appUrl=${appUrl}): API call took ${Date.now() - _start_fetchPromiseDelayedSseStats_13} ms`, { "event.action": "fetchPromiseDelayedSseStats", "event.category": "network", "logrite.appUrl": appUrl });
  return response.json();
};

export const releasePromiseDelayedSse = async (appUrl: string) => {
logger.error(`>>> Entering releasePromiseDelayedSse(appUrl=${appUrl})`, { "event.action": "releasePromiseDelayedSse", "logrite.appUrl": appUrl });
  const response = await fetch(`${appUrl}/sse/promise-delayed/release`, {
    method: 'POST',
  });
  const { released } = await response.json();
const _start_releasePromiseDelayedSse_22 = Date.now();

logger.warn(`<<< Exiting releasePromiseDelayedSse(appUrl=${appUrl})`, { "event.action": "releasePromiseDelayedSse", "logrite.appUrl": appUrl });
logger.error(`releasePromiseDelayedSse(appUrl=${appUrl}): API call took ${Date.now() - _start_releasePromiseDelayedSse_22} ms`, { "event.action": "releasePromiseDelayedSse", "event.category": "network", "logrite.appUrl": appUrl });
  return released as number;
};

const waitForPromiseDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: PromiseDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.error(`>>> Entering waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForPromiseDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
	logger.error(`waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`, { "event.action": "waitForPromiseDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
    const stats = await fetchPromiseDelayedSseStats(appUrl);
	logger.error(`waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`, { "event.action": "waitForPromiseDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.warn(`<<< Exiting waitForPromiseDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForPromiseDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  throw new Error(timeoutErrorMessage);
};

export const waitForPromiseDelayedSseRequestStart = async (appUrl: string) => {
logger.error(`>>> Entering waitForPromiseDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseRequestStart", "logrite.appUrl": appUrl });
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the delayed SSE request to start.',
  );
logger.warn(`<<< Exiting waitForPromiseDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseRequestStart", "logrite.appUrl": appUrl });
};

export const waitForPromiseDelayedSseClose = async (appUrl: string) => {
logger.error(`>>> Entering waitForPromiseDelayedSseClose(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseClose", "logrite.appUrl": appUrl });
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the delayed SSE request to close.',
  );
logger.warn(`<<< Exiting waitForPromiseDelayedSseClose(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseClose", "logrite.appUrl": appUrl });
};

export const waitForPromiseDelayedSseTeardown = async (appUrl: string) => {
logger.error(`>>> Entering waitForPromiseDelayedSseTeardown(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseTeardown", "logrite.appUrl": appUrl });
  await waitForPromiseDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the delayed SSE teardown to run.',
  );
logger.warn(`<<< Exiting waitForPromiseDelayedSseTeardown(appUrl=${appUrl})`, { "event.action": "waitForPromiseDelayedSseTeardown", "logrite.appUrl": appUrl });
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
const _start_fetchInterceptorDelayedSseStats_95 = Date.now();
logger.error(`>>> Entering fetchInterceptorDelayedSseStats(appUrl=${appUrl})`, { "event.action": "fetchInterceptorDelayedSseStats", "logrite.appUrl": appUrl });
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/stats`,
  );
logger.error(`fetchInterceptorDelayedSseStats(appUrl=${appUrl}): response → ${response}`, { "event.action": "fetchInterceptorDelayedSseStats", "logrite.appUrl": appUrl });
logger.error(`fetchInterceptorDelayedSseStats(appUrl=${appUrl}): API call took ${Date.now() - _start_fetchInterceptorDelayedSseStats_95} ms`, { "event.action": "fetchInterceptorDelayedSseStats", "event.category": "network", "logrite.appUrl": appUrl });
logger.warn(`<<< Exiting fetchInterceptorDelayedSseStats(appUrl=${appUrl})`, { "event.action": "fetchInterceptorDelayedSseStats", "logrite.appUrl": appUrl });
  return response.json();
};

export const releaseInterceptorDelayedSse = async (appUrl: string) => {
logger.error(`>>> Entering releaseInterceptorDelayedSse(appUrl=${appUrl})`, { "event.action": "releaseInterceptorDelayedSse", "logrite.appUrl": appUrl });
  const response = await fetch(
    `${appUrl}/sse/interceptor/promise-delayed/release`,
    { method: 'POST' },
  );
  const { released } = await response.json();
const _start_releaseInterceptorDelayedSse_89 = Date.now();
logger.error(`releaseInterceptorDelayedSse(appUrl=${appUrl}): API call took ${Date.now() - _start_releaseInterceptorDelayedSse_89} ms`, { "event.action": "releaseInterceptorDelayedSse", "event.category": "network", "logrite.appUrl": appUrl });

logger.warn(`<<< Exiting releaseInterceptorDelayedSse(appUrl=${appUrl})`, { "event.action": "releaseInterceptorDelayedSse", "logrite.appUrl": appUrl });
  return released as number;
};

const waitForInterceptorDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: InterceptorDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.error(`>>> Entering waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForInterceptorDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  const deadline = Date.now() + 2_000;

logger.error(`waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`, { "event.action": "waitForInterceptorDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  while (Date.now() < deadline) {
    const stats = await fetchInterceptorDelayedSseStats(appUrl);
	logger.error(`waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`, { "event.action": "waitForInterceptorDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.warn(`<<< Exiting waitForInterceptorDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForInterceptorDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  throw new Error(timeoutErrorMessage);
};

export const waitForInterceptorDelayedSseRequestStart = async (
  appUrl: string,
) => {
logger.error(`>>> Entering waitForInterceptorDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseRequestStart", "logrite.appUrl": appUrl });
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the interceptor-delayed SSE request to start.',
  );
	logger.warn(`<<< Exiting waitForInterceptorDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseRequestStart", "logrite.appUrl": appUrl });
};

export const waitForInterceptorDelayedSseClose = async (appUrl: string) => {
logger.error(`>>> Entering waitForInterceptorDelayedSseClose(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseClose", "logrite.appUrl": appUrl });
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.closeEventsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE request to close.',
  );
logger.warn(`<<< Exiting waitForInterceptorDelayedSseClose(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseClose", "logrite.appUrl": appUrl });
};

export const waitForInterceptorDelayedSseTeardown = async (appUrl: string) => {
logger.error(`>>> Entering waitForInterceptorDelayedSseTeardown(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseTeardown", "logrite.appUrl": appUrl });
  await waitForInterceptorDelayedSseStat(
    appUrl,
    stats => stats.teardownsObserved > 0,
    'Timed out waiting for the interceptor-delayed SSE teardown to run.',
  );
logger.warn(`<<< Exiting waitForInterceptorDelayedSseTeardown(appUrl=${appUrl})`, { "event.action": "waitForInterceptorDelayedSseTeardown", "logrite.appUrl": appUrl });
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
const _start_fetchSignalDelayedSseStats_183 = Date.now();
logger.error(`>>> Entering fetchSignalDelayedSseStats(appUrl=${appUrl})`, { "event.action": "fetchSignalDelayedSseStats", "logrite.appUrl": appUrl });
  const response = await fetch(`${appUrl}/sse/signal/promise-delayed/stats`);
logger.error(`fetchSignalDelayedSseStats(appUrl=${appUrl}): response → ${response}`, { "event.action": "fetchSignalDelayedSseStats", "logrite.appUrl": appUrl });
logger.error(`fetchSignalDelayedSseStats(appUrl=${appUrl}): API call took ${Date.now() - _start_fetchSignalDelayedSseStats_183} ms`, { "event.action": "fetchSignalDelayedSseStats", "event.category": "network", "logrite.appUrl": appUrl });
logger.warn(`<<< Exiting fetchSignalDelayedSseStats(appUrl=${appUrl})`, { "event.action": "fetchSignalDelayedSseStats", "logrite.appUrl": appUrl });
  return response.json();
};

const waitForSignalDelayedSseStat = async (
  appUrl: string,
  predicate: (stats: SignalDelayedSseStats) => boolean,
  timeoutErrorMessage: string,
) => {
logger.error(`>>> Entering waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForSignalDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  const deadline = Date.now() + 2_000;

logger.error(`waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`, { "event.action": "waitForSignalDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  while (Date.now() < deadline) {
    const stats = await fetchSignalDelayedSseStats(appUrl);
	logger.error(`waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): stats → ${stats}`, { "event.action": "waitForSignalDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });

    if (predicate(stats)) {
      return;
    }

    await sleep(20);
  }

logger.warn(`<<< Exiting waitForSignalDelayedSseStat(appUrl=${appUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForSignalDelayedSseStat", "logrite.appUrl": appUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  throw new Error(timeoutErrorMessage);
};

export const waitForSignalDelayedSseRequestStart = async (appUrl: string) => {
logger.error(`>>> Entering waitForSignalDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForSignalDelayedSseRequestStart", "logrite.appUrl": appUrl });
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.requestsStarted > 0,
    'Timed out waiting for the signal-delayed SSE request to start.',
  );
logger.warn(`<<< Exiting waitForSignalDelayedSseRequestStart(appUrl=${appUrl})`, { "event.action": "waitForSignalDelayedSseRequestStart", "logrite.appUrl": appUrl });
};

export const waitForSignalDelayedSseResourceCleanup = async (
  appUrl: string,
) => {
logger.error(`>>> Entering waitForSignalDelayedSseResourceCleanup(appUrl=${appUrl})`, { "event.action": "waitForSignalDelayedSseResourceCleanup", "logrite.appUrl": appUrl });
  await waitForSignalDelayedSseStat(
    appUrl,
    stats => stats.resourcesCleaned > 0,
    'Timed out waiting for the signal-delayed SSE resource cleanup to run.',
  );
	logger.warn(`<<< Exiting waitForSignalDelayedSseResourceCleanup(appUrl=${appUrl})`, { "event.action": "waitForSignalDelayedSseResourceCleanup", "logrite.appUrl": appUrl });
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
logger.error(`>>> Entering waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForSignalLifetimeSseStat", "logrite.statsUrl": statsUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
const _start_waitForSignalLifetimeSseStat_203 = Date.now();
  const deadline = Date.now() + 2_000;

logger.error(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): deadline → ${deadline}`, { "event.action": "waitForSignalLifetimeSseStat", "logrite.statsUrl": statsUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
  while (Date.now() < deadline) {
    const response = await fetch(statsUrl);
	logger.error(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage}): response → ${response}`, { "event.action": "waitForSignalLifetimeSseStat", "logrite.statsUrl": statsUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
    const stats: SignalLifetimeSseStats = await response.json();

    if (predicate(stats)) {
	logger.error(`waitForSignalLifetimeSseStat(statsUrl=${statsUrl}, predicate=${predicate}, timeoutErrorMessage=${timeoutErrorMessage}): API call took ${Date.now() - _start_waitForSignalLifetimeSseStat_203} ms`, { "event.action": "waitForSignalLifetimeSseStat", "event.category": "network", "logrite.statsUrl": statsUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
	logger.warn(`<<< Exiting waitForSignalLifetimeSseStat(statsUrl=${statsUrl},predicate=${predicate},timeoutErrorMessage=${timeoutErrorMessage})`, { "event.action": "waitForSignalLifetimeSseStat", "logrite.statsUrl": statsUrl, "logrite.predicate": predicate, "logrite.timeoutErrorMessage": timeoutErrorMessage });
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
