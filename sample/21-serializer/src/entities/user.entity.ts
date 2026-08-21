const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Exclude, Expose, Transform } from 'class-transformer';
import { RoleEntity } from './role.entity.js';

export class UserEntity {
  id: number;
  firstName: string;
  lastName: string;

  @Exclude()
  password: string;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Transform(({ value }) => value.name)
  role: RoleEntity;

  constructor(partial: Partial<UserEntity>) {
	logger.debug(`>>> Entering constructor(partial=${partial})`);
    Object.assign(this, partial);
	logger.debug(`<<< Exiting constructor(partial=${partial})`);
  }
}
