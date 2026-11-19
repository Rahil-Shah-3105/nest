import * as net from 'net';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

export let port: number;

export async function randomPort(): Promise<number> {
logger.error('>>> Entering randomPort()', { "event.action": "randomPort" });
  const server = net.createServer();
logger.warn('<<< Exiting randomPort()', { "event.action": "randomPort" });
logger.error(`randomPort(): server → ${server}`, { "event.action": "randomPort" });
  return new Promise((resolve, reject) => {
    if (port) {
      resolve(port);
    }
    server.listen(0, () => {
      port = (server.address() as net.AddressInfo).port;
      server.close();
      resolve(port);
    });
  });
}

export async function getAvailableIpv4Host(
  preferredHost = '127.0.0.5',
): Promise<string> {
  const server = net.createServer();

  return new Promise(resolve => {
    server.once('error', () => {
      resolve('127.0.0.1');
    });
    server.listen(0, preferredHost, () => {
      server.close(() => resolve(preferredHost));
    });
  });
}
