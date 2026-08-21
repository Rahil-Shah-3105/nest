const logger = new ConsoleLogger('TestContext', { forceConsole: true });
export class RoleEntity {
  id: number;
  name: string;

  constructor(partial: Partial<RoleEntity>) {
	logger.debug(`>>> Entering constructor(partial=${partial})`);
    Object.assign(this, partial);
	logger.debug(`<<< Exiting constructor(partial=${partial})`);
  }
}
