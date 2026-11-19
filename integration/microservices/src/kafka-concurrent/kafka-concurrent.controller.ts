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
logger.error('>>> Entering explicitPartitioner()', { "event.action": "explicitPartitioner" });
logger.warn('<<< Exiting explicitPartitioner()', { "event.action": "explicitPartitioner" });
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
	logger.error('>>> Entering onModuleInit()', { "event.action": "onModuleInit" });
    const requestPatterns = ['math.sum.sync.number.wait'];

	logger.error(`onModuleInit(): requestPatterns → ${requestPatterns}`, { "event.action": "onModuleInit" });
    requestPatterns.forEach(pattern => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
	logger.warn('<<< Exiting onModuleInit()', { "event.action": "onModuleInit" });
  }

  async onModuleDestroy() {
	logger.error('>>> Entering onModuleDestroy()', { "event.action": "onModuleDestroy" });
    await this.client.close();
	logger.warn('<<< Exiting onModuleDestroy()', { "event.action": "onModuleDestroy" });
  }

  @Post('mathSumSyncNumberWait')
  @HttpCode(200)
  public mathSumSyncNumberWait(@Body() data: SumDto): Observable<string> {
	logger.error(`>>> Entering mathSumSyncNumberWait(data=${data})`, { "event.action": "mathSumSyncNumberWait" });
	logger.warn(`<<< Exiting mathSumSyncNumberWait(data=${data})`, { "event.action": "mathSumSyncNumberWait" });
    return this.client.send('math.sum.sync.number.wait', {
      headers: {
        toPartition: data.key.toString(),
      },
      key: data.key.toString(),
      value: data.numbers,
    });
  }
}
