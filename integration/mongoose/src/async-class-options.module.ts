const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Module } from '@nestjs/common';
import {
  MongooseModule,
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module.js';

class ConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
	logger.debug('>>> Entering createMongooseOptions()');
	logger.debug('<<< Exiting createMongooseOptions()');
    return {
      uri: 'mongodb://localhost:27017/test',
    };
  }
}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: ConfigService,
    }),
    CatsModule,
  ],
})
export class AsyncOptionsClassModule {}
