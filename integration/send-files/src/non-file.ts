const logger = new ConsoleLogger('TestContext', { forceConsole: true });
export class NonFile {
  constructor(private readonly value: string) {}

  pipe() {
	logger.debug('>>> Entering pipe()');
	logger.debug('<<< Exiting pipe()');
    return this.value;
  }
}
