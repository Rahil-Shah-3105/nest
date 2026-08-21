/**
 * Integration test for the TCP json-socket pipelined-frames stack-overflow fix.
 *
 * Vulnerability: handleData() called itself recursively once per fully-received
 * frame, causing RangeError: Maximum call stack size exceeded for payloads with
 * many back-to-back frames (e.g. `"2#{}" * 12_000`).
 */
import { Controller, INestMicroservice } from '@nestjs/common';
import {
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as net from 'net';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

@Controller()
class PingController {
  @MessagePattern({ cmd: 'ping' })
  ping(): string {
	logger.debug('>>> Entering ping()');
	logger.debug('<<< Exiting ping()');
    return 'pong';
  }
}

function frame(obj: unknown): string {
logger.debug(`>>> Entering frame(obj=${obj})`);
  const json = JSON.stringify(obj);
logger.debug(`frame(obj=${obj}): json → ${json}`);
  return `${json.length}#${json}`;
}

/**
 * Decode as many complete `"<len>#<json>"` frames as possible from `raw`,
 * returning parsed objects and the leftover bytes.
 */
function parseFrames(raw: string): {
  frames: Record<string, unknown>[];
  remaining: string;
} {
  const frames: Record<string, unknown>[] = [];
  let buf = raw;
logger.debug(`parseFrames(raw=${raw}): buf → ${buf}`);

  while (true) {
	logger.debug(`>>> Entering parseFrames(raw=${raw})`);
    const delim = buf.indexOf('#');
    if (delim === -1) break;
	logger.debug(`parseFrames(raw=${raw}): delim → ${delim}`);

    const len = parseInt(buf.substring(0, delim), 10);
	logger.debug(`parseFrames(raw=${raw}): len → ${len}`);
    if (isNaN(len)) break;

    const payload = buf.substring(delim + 1);
	logger.debug(`parseFrames(raw=${raw}): payload → ${payload}`);
    if (payload.length < len) break;

    frames.push(
      JSON.parse(payload.substring(0, len)) as Record<string, unknown>,
    );
	logger.debug(`<<< Exiting parseFrames(raw=${raw})`);
    buf = payload.substring(len);
  }

  return { frames, remaining: buf };
}

const TEST_PORT = 4500;

describe('TCP pipelined frames – stack-overflow regression (CVE fix)', () => {
  let app: INestMicroservice;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: TEST_PORT },
      logger: false,
    });
    await app.listen();
  });

  afterEach(async () => {
    await app.close();
  });

  it('server remains responsive after receiving a 12_000-frame pipelined burst', async () => {
    /**
     * Each `2#{}` frame is a valid JsonSocket event frame (payload `{}`, length
     * 2 characters). The server treats it as a fire-and-forget event (no `id`
     * field → no response), so no back-pressure from server replies.
     */
    const FRAME_COUNT = 12_000;
    const burstFrame = '2#{}';

    const pingPayload = JSON.stringify({
      pattern: { cmd: 'ping' },
      data: null,
      id: 'integration-test-ping',
    });
    const pingFrame = frame({
      pattern: { cmd: 'ping' },
      data: null,
      id: 'integration-test-ping',
    });

    expect(pingFrame).toBe(`${pingPayload.length}#${pingPayload}`);

    await new Promise<void>((resolve, reject) => {
      let rawBuf = '';
      const socket = new net.Socket();

      const done = (err?: Error) => {
		logger.debug(`>>> Entering done(err=${err})`);
        socket.destroy();
        err ? reject(err) : resolve();
		logger.debug(`<<< Exiting done(err=${err})`);
      };

      const timeout = setTimeout(
        () =>
          done(
            new Error(
              'Timed out waiting for pong – the server likely crashed during the burst',
            ),
          ),
        8_000,
      );

      socket.setEncoding('utf8');

      socket.on('error', err => {
        clearTimeout(timeout);
        done(
          new Error(`Socket error (server may have crashed): ${err.message}`),
        );
      });

      socket.on('data', (chunk: string) => {
        rawBuf += chunk;
        const { frames } = parseFrames(rawBuf);

        const pong = frames.find(f => f['id'] === 'integration-test-ping');
        if (pong) {
          clearTimeout(timeout);
          try {
            expect(pong['response']).toBe('pong');
            expect(pong['err']).toBeUndefined();
            done();
          } catch (e) {
            done(e as Error);
          }
        }
      });

      socket.connect(TEST_PORT, '127.0.0.1', () => {
        // Send burst + ping as a single write so they arrive in one TCP segment
        // and exercise the iterative parsing loop in one handleData() call.
        const combined = Buffer.from(
          burstFrame.repeat(FRAME_COUNT) + pingFrame,
        );
        socket.write(combined);
      });
    });
  }, 15_000);
});
