const logger = new ConsoleLogger('TestContext', { forceConsole: true });
export class NonFile {
  constructor(private readonly value: string) {}

  pipe() {
	logger.error('>>> Entering pipe()', { "event.action": "pipe" });
	logger.warn('<<< Exiting pipe()', { "event.action": "pipe" });
    return this.value;
  }
}
