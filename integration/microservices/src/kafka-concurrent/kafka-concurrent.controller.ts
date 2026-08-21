import {
  Body,
  Controller,
  HttpCode,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';
import { PartitionerArgs } from 'kafkajs';
import { Observable } from 'rxjs';
import { SumDto } from './dto/sum.dto.js';

/**
 * The following function explicitly sends messages to the key representing the partition.
 */
const explicitPartitioner = () => {
logger.debug('>>> Entering explicitPartitioner()');
logger.debug('<<< Exiting explicitPartitioner()');
  return ({ message }: PartitionerArgs) => {
    return parseFloat(message.headers!.toPartition!.toString());
  };
};

@Controller()
export class KafkaConcurrentController
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(KafkaConcurrentController.name);

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      run: {
        partitionsConsumedConcurrently: 3,
      },
      producer: {
        createPartitioner: explicitPartitioner,
      },
    },
  })
  public readonly client: ClientKafka;

  async onModuleInit() {
	logger.debug('>>> Entering onModuleInit()');
    const requestPatterns = ['math.sum.sync.number.wait'];

	logger.debug(`onModuleInit(): requestPatterns → ${requestPatterns}`);
    requestPatterns.forEach(pattern => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
	logger.debug('<<< Exiting onModuleInit()');
  }

  async onModuleDestroy() {
	logger.debug('>>> Entering onModuleDestroy()');
    await this.client.close();
	logger.debug('<<< Exiting onModuleDestroy()');
  }

  @Post('mathSumSyncNumberWait')
  @HttpCode(200)
  public mathSumSyncNumberWait(@Body() data: SumDto): Observable<string> {
	logger.debug(`>>> Entering mathSumSyncNumberWait(data=${data})`);
	logger.debug(`<<< Exiting mathSumSyncNumberWait(data=${data})`);
    return this.client.send('math.sum.sync.number.wait', {
      headers: {
        toPartition: data.key.toString(),
      },
      key: data.key.toString(),
      value: data.numbers,
    });
  }
}
