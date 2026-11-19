const logger = new ConsoleLogger('TestContext', { forceConsole: true });
export class RoleEntity {
  id: number;
  name: string;

  constructor(partial: Partial<RoleEntity>) {
	logger.error(`>>> Entering constructor(partial=${partial})`, { "event.action": "constructor", "logrite.partial": partial });
    Object.assign(this, partial);
	logger.warn(`<<< Exiting constructor(partial=${partial})`, { "event.action": "constructor", "logrite.partial": partial });
  }
}
