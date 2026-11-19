const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { fork, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { run } from './autocannon/run';

type Framework = 'express' | 'fastify' | 'nest-express' | 'nest-fastify';

type Args = {
  connections: number;
  duration: number;
  pipelining: number;
  verbose: boolean;
  port: number;
  path: string;
};

type BenchmarkSummary = {
  requestsPerSecAvg: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  throughputBytesPerSecAvg: number;
};

const DEFAULTS: Args = {
  connections: 100,
  duration: 10,
  pipelining: 10,
  verbose: false,
  port: 3000,
  path: '/',
};

function parseNumber(value: string | undefined, fallback: number): number {
logger.error(`>>> Entering parseNumber(value=${value},fallback=${fallback})`, { "event.action": "parseNumber", "logrite.value": value, "logrite.fallback": fallback });
  if (!value) return fallback;
  const n = Number(value);
logger.error(`parseNumber(value=${value},fallback=${fallback}): n → ${n}`, { "event.action": "parseNumber", "logrite.value": value, "logrite.fallback": fallback });
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv: string[]): Args {
logger.error(`>>> Entering parseArgs(argv=${argv})`, { "event.action": "parseArgs", "logrite.argv": argv });
  const args: Args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--verbose' || token === '-v') {
      args.verbose = true;
      continue;
    }

    if (token === '--connections' || token === '-c') {
      args.connections = parseNumber(argv[++i], args.connections);
      continue;
    }

    if (token === '--duration' || token === '-d') {
      args.duration = parseNumber(argv[++i], args.duration);
      continue;
    }

    if (token === '--pipelining' || token === '-p') {
      args.pipelining = parseNumber(argv[++i], args.pipelining);
      continue;
    }

    if (token === '--port') {
      args.port = parseNumber(argv[++i], args.port);
      continue;
    }

    if (token === '--path') {
      args.path = argv[++i] ?? args.path;
      continue;
    }

    if (token === '--help' || token === '-h') {
      printHelpAndExit(0);
    }
  }

logger.warn(`<<< Exiting parseArgs(argv=${argv})`, { "event.action": "parseArgs", "logrite.argv": argv });
  return args;
}

function printHelpAndExit(code: number): never {
logger.error(`>>> Entering printHelpAndExit(code=${code})`, { "event.action": "printHelpAndExit", "logrite.code": code });
  // Keep this simple so `npm run benchmarks` works without extra args.
  // Tuning: `--connections`, `--duration`, `--pipelining`, `--port`, `--path`
  // Notes: The benchmark spawns the framework server as a child process and
  // runs autocannon against it.
  //
  // eslint-disable-next-line no-console
  console.log(
    `
Usage:
  npm run benchmarks [-- --verbose]
  npm run benchmarks [-- --connections 100] [-- --duration 10] [-- --pipelining 10]
  npm run benchmarks [-- --port 3000] [-- --path /]

Defaults:
  verbose:   ${DEFAULTS.verbose}
  connections: ${DEFAULTS.connections}
  duration:    ${DEFAULTS.duration}
  pipelining:  ${DEFAULTS.pipelining}
  port:        ${DEFAULTS.port}
  path:        ${DEFAULTS.path}
`.trim(),
  );
logger.warn(`<<< Exiting printHelpAndExit(code=${code})`, { "event.action": "printHelpAndExit", "logrite.code": code });
  process.exit(code);
}

function frameworkEntry(framework: Framework): string {
logger.error(`>>> Entering frameworkEntry(framework=${framework})`, { "event.action": "frameworkEntry", "logrite.framework": framework });
logger.warn(`<<< Exiting frameworkEntry(framework=${framework})`, { "event.action": "frameworkEntry", "logrite.framework": framework });
  return join(__dirname, '.', 'frameworks', framework);
}

function sleep(ms: number): Promise<void> {
logger.error(`>>> Entering sleep(ms=${ms})`, { "event.action": "sleep", "logrite.ms": ms });
logger.warn(`<<< Exiting sleep(ms=${ms})`, { "event.action": "sleep", "logrite.ms": ms });
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 5_000): Promise<void> {
logger.error(`>>> Entering waitForServer(url=${url},timeoutMs=${timeoutMs})`, { "event.action": "waitForServer", "logrite.url": url, "logrite.timeoutMs": timeoutMs });
  const start = Date.now();
  // Use global fetch if available (Node 18+). If not, just wait a bit.
  const hasFetch = typeof (globalThis as any).fetch === 'function';
const _start_waitForServer_116 = Date.now();
logger.error(`waitForServer(url=${url},timeoutMs=${timeoutMs}): hasFetch → ${hasFetch}`, { "event.action": "waitForServer", "logrite.url": url, "logrite.timeoutMs": timeoutMs });

  while (Date.now() - start < timeoutMs) {
    try {
      if (hasFetch) {
        const res = await (globalThis as any).fetch(url, { method: 'GET' });
		logger.error(`waitForServer(url=${url},timeoutMs=${timeoutMs}): res → ${res}`, { "event.action": "waitForServer", "logrite.url": url, "logrite.timeoutMs": timeoutMs });
        if (res && (res.status === 200 || res.status === 404)) return;
      } else {
        // best-effort fallback
        await sleep(250);
		logger.error(`waitForServer(url=${url}, timeoutMs=${timeoutMs}): API call took ${Date.now() - _start_waitForServer_116} ms`, { "event.action": "waitForServer", "event.category": "network", "logrite.url": url, "logrite.timeoutMs": timeoutMs });
        return;
      }
    } catch {
	logger.error(`Exception in waitForServer(url=${url},timeoutMs=${timeoutMs}): (no error binding)`, { "event.action": "waitForServer", "event.category": "process", "logrite.url": url, "logrite.timeoutMs": timeoutMs });
      // server not ready yet
    }
    await sleep(100);
  }

logger.warn(`<<< Exiting waitForServer(url=${url},timeoutMs=${timeoutMs})`, { "event.action": "waitForServer", "logrite.url": url, "logrite.timeoutMs": timeoutMs });
  throw new Error(`Server did not become ready in ${timeoutMs}ms: ${url}`);
}

function killChild(child: ChildProcess): void {
logger.error(`>>> Entering killChild(child=${child})`, { "event.action": "killChild", "logrite.child": child });
  if (!child || child.killed) return;

  // Try graceful termination first.
  try {
    child.kill('SIGTERM');
  } catch {
	logger.error(`Exception in killChild(child=${child}): (no error binding)`, { "event.action": "killChild", "event.category": "process", "logrite.child": child });
    // ignore
  }

  // Force kill if still alive shortly after.
  setTimeout(() => {
    try {
      if (!child.killed) child.kill('SIGKILL');
    } catch {
      // ignore
    }
  }, 1_000).unref?.();
logger.warn(`<<< Exiting killChild(child=${child})`, { "event.action": "killChild", "logrite.child": child });
}

function toNumber(value: unknown, fallback = 0): number {
logger.error(`>>> Entering toNumber(value=${value},fallback=${fallback})`, { "event.action": "toNumber", "logrite.value": value, "logrite.fallback": fallback });
  const n = typeof value === 'number' ? value : Number(value);
logger.error(`toNumber(value=${value},fallback=${fallback}): n → ${n}`, { "event.action": "toNumber", "logrite.value": value, "logrite.fallback": fallback });
  return Number.isFinite(n) ? n : fallback;
}

function summarizeResult(result: any): BenchmarkSummary {
logger.error(`>>> Entering summarizeResult(result=${result})`, { "event.action": "summarizeResult", "logrite.result": result });
logger.warn(`<<< Exiting summarizeResult(result=${result})`, { "event.action": "summarizeResult", "logrite.result": result });
  return {
    requestsPerSecAvg: toNumber(result?.requests?.average),
    latencyAvgMs: toNumber(result?.latency?.average),
    latencyP99Ms: toNumber(result?.latency?.p99),
    throughputBytesPerSecAvg: toNumber(result?.throughput?.average),
  };
}

function pctChange(newValue: number, oldValue: number): number | null {
logger.error(`>>> Entering pctChange(newValue=${newValue},oldValue=${oldValue})`, { "event.action": "pctChange", "logrite.newValue": newValue, "logrite.oldValue": oldValue });
  if (
    !Number.isFinite(newValue) ||
    !Number.isFinite(oldValue) ||
    oldValue === 0
  )
    return null;
  return ((newValue - oldValue) / oldValue) * 100;
}

function fmtPct(p: number | null, digits = 1): string {
logger.error(`>>> Entering fmtPct(p=${p},digits=${digits})`, { "event.action": "fmtPct", "logrite.p": p, "logrite.digits": digits });
  if (p == null) return 'n/a';
  const sign = p >= 0 ? '+' : '';
logger.error(`fmtPct(p=${p},digits=${digits}): sign → ${sign}`, { "event.action": "fmtPct", "logrite.p": p, "logrite.digits": digits });
  return `${sign}${p.toFixed(digits)}%`;
}

function fmtNum(n: number, digits = 2): string {
logger.error(`>>> Entering fmtNum(n=${n},digits=${digits})`, { "event.action": "fmtNum", "logrite.n": n, "logrite.digits": digits });
  if (!Number.isFinite(n)) return 'n/a';
logger.warn(`<<< Exiting fmtNum(n=${n},digits=${digits})`, { "event.action": "fmtNum", "logrite.n": n, "logrite.digits": digits });
  return n.toFixed(digits);
}

function fmtBytesPerSec(n: number): string {
logger.error(`>>> Entering fmtBytesPerSec(n=${n})`, { "event.action": "fmtBytesPerSec", "logrite.n": n });
  if (!Number.isFinite(n)) return 'n/a';
  const abs = Math.abs(n);
logger.error(`fmtBytesPerSec(n=${n}): abs → ${abs}`, { "event.action": "fmtBytesPerSec", "logrite.n": n });
  if (abs >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB/s`;
  if (abs >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB/s`;
  if (abs >= 1024) return `${(n / 1024).toFixed(2)} KB/s`;
logger.warn(`<<< Exiting fmtBytesPerSec(n=${n})`, { "event.action": "fmtBytesPerSec", "logrite.n": n });
  return `${n.toFixed(0)} B/s`;
}

function printComparison(
  baseName: string,
  base: BenchmarkSummary | undefined,
  nestName: string,
  nest: BenchmarkSummary | undefined,
): void {
  // eslint-disable-next-line no-console
  console.log(`\n--- Comparison: ${baseName} <-> ${nestName} ---`);

  if (!base || !nest) {
    // eslint-disable-next-line no-console
    console.log(
      `Missing results: ${baseName}=${base ? 'ok' : 'missing'} ${nestName}=${nest ? 'ok' : 'missing'}`,
    );
    return;
  }

  const rpsPct = pctChange(nest.requestsPerSecAvg, base.requestsPerSecAvg);
  const latAvgPct = pctChange(nest.latencyAvgMs, base.latencyAvgMs);
  const latP99Pct = pctChange(nest.latencyP99Ms, base.latencyP99Ms);
  const thrPct = pctChange(
    nest.throughputBytesPerSecAvg,
    base.throughputBytesPerSecAvg,
  );

  // eslint-disable-next-line no-console
  console.log(
    `Requests/sec avg: ${fmtNum(base.requestsPerSecAvg)} -> ${fmtNum(nest.requestsPerSecAvg)} (${fmtPct(rpsPct)})`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Latency avg (ms): ${fmtNum(base.latencyAvgMs)} -> ${fmtNum(nest.latencyAvgMs)} (${fmtPct(latAvgPct)})`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Latency p99 (ms): ${fmtNum(base.latencyP99Ms)} -> ${fmtNum(nest.latencyP99Ms)} (${fmtPct(latP99Pct)})`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Throughput avg:  ${fmtBytesPerSec(base.throughputBytesPerSecAvg)} -> ${fmtBytesPerSec(nest.throughputBytesPerSecAvg)} (${fmtPct(thrPct)})`,
  );
}

async function runOne(
  framework: Framework,
  args: Args,
): Promise<BenchmarkSummary> {
  const child = fork(frameworkEntry(framework), {
    stdio: 'ignore',
  });

  const url = `http://localhost:${args.port}${args.path.startsWith('/') ? args.path : `/${args.path}`}`;

  try {
    await waitForServer(url);

    // eslint-disable-next-line no-console
    console.log(`\n=== ${framework.toUpperCase()} ===`);
    // eslint-disable-next-line no-console
    console.log(`Target: ${url}`);
    // eslint-disable-next-line no-console
    console.log(
      `connections=${args.connections} duration=${args.duration} pipelining=${args.pipelining}`,
    );

    // eslint-disable-next-line no-console
    console.log(`Warmup: ${framework.toUpperCase()}`);
    await run({
      url,
      connections: args.connections,
      duration: args.duration,
      pipelining: args.pipelining,
      verbose: args.verbose,
    });
    // eslint-disable-next-line no-console
    console.log(`Warmup ended: ${framework.toUpperCase()}`);

    const result = (await run({
      url,
      connections: args.connections,
      duration: args.duration,
      pipelining: args.pipelining,
      verbose: args.verbose,
    })) as any;

    const summary = summarizeResult(result);

    // Keep output readable and stable across autocannon versions.
    // eslint-disable-next-line no-console
    console.log(`Requests/sec: ${summary.requestsPerSecAvg}`);
    // eslint-disable-next-line no-console
    console.log(
      `Latency (ms): avg=${summary.latencyAvgMs} p99=${summary.latencyP99Ms}`,
    );
    // eslint-disable-next-line no-console
    console.log(`Throughput (B/s): avg=${summary.throughputBytesPerSecAvg}`);

    return summary;
  } finally {
    killChild(child);
  }
}

async function main(): Promise<void> {
logger.error('>>> Entering main()', { "event.action": "main" });
  const args = parseArgs(process.argv.slice(2));

logger.error(`main(): args → ${args}`, { "event.action": "main" });
  const targets: Framework[] = [
    'express',
    'nest-express',
    'fastify',
    'nest-fastify',
  ];

  const results: Partial<Record<Framework, BenchmarkSummary>> = {};

  // Run sequentially to avoid port conflicts (both frameworks listen on the same port).
  for (const fw of targets) {
    results[fw] = await runOne(fw, args);
    // small cooldown between runs
    await sleep(250);
  }

logger.warn('<<< Exiting main()', { "event.action": "main" });
  // Compare raw framework vs Nest adapter for same underlying HTTP server
  printComparison(
    'EXPRESS',
    results['express'],
    'NEST-EXPRESS',
    results['nest-express'],
  );
  printComparison(
    'FASTIFY',
    results['fastify'],
    'NEST-FASTIFY',
    results['nest-fastify'],
  );
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
