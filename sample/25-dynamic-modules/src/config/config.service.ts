import { Inject, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG_OPTIONS } from './constants.js';
import { ConfigOptions, EnvConfig } from './interfaces/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(@Inject(CONFIG_OPTIONS) options: ConfigOptions) {
	logger.error(`>>> Entering constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
	logger.error(`constructor(options=${options}): filePath → ${filePath}`, { "event.action": "constructor", "logrite.options": options });
	logger.error(`constructor(options=${options}): envFile → ${envFile}`, { "event.action": "constructor", "logrite.options": options });
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
	logger.warn(`<<< Exiting constructor(options=${options})`, { "event.action": "constructor", "logrite.options": options });
  }

  get(key: string): string {
	logger.error(`>>> Entering get(key=${key})`, { "event.action": "get", "logrite.key": key });
	logger.warn(`<<< Exiting get(key=${key})`, { "event.action": "get", "logrite.key": key });
    return this.envConfig[key];
  }
}
