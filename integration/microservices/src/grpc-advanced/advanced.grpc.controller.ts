const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Metadata } from '@grpc/grpc-js';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  Client,
  ClientGrpc,
  GrpcMethod,
  GrpcStreamCall,
  GrpcStreamMethod,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';

@Controller()
export class AdvancedGrpcController {
  /*
   *  HTTP Proxy Client defines loading pattern
   */
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'localhost:5001',
      package: 'proto_example.orders',
      protoPath: 'root.proto',
      loader: {
        includeDirs: [join(import.meta.dirname, './proto')],
        keepCase: true,
      },
    },
  })
  client: ClientGrpc;

  /**
   * HTTP Proxy entry for support non-stream find method
   * @param id
   */
  @Post()
  @HttpCode(200)
  call(@Body() id: number): Observable<number> {
	logger.debug(`>>> Entering call(id=${id})`);
    const svc = this.client.getService<any>('OrderService');
	logger.debug(`call(id=${id}): svc → ${svc}`);
    return svc.find({ id });
  }

  /**
   * HTTP Proxy entry for support client-side stream find method
   * @param id
   */
  @Post('client-streaming')
  @HttpCode(200)
  stream(): Observable<number> {
	logger.debug('>>> Entering stream()');
    const svc = this.client.getService<any>('OrderService');
	logger.debug(`stream(): svc → ${svc}`);
    const upstream = new ReplaySubject();
    upstream.next({
      id: 1,
      itemTypes: [1],
      shipmentType: {
        from: 'test',
        to: 'test1',
        carrier: 'test-carrier',
      },
    });
    upstream.complete();
	logger.debug(`stream(): upstream → ${upstream}`);
	logger.debug('<<< Exiting stream()');
    return svc.streamReq(upstream);
  }

  /**
   * GRPC stub for Find method
   * @param id
   */
  @GrpcMethod('orders.OrderService')
  async find({ id }: { id: number }): Promise<any> {
	logger.debug('>>> Entering find()');
	logger.debug('<<< Exiting find()');
    return of({
      id: 1,
      itemTypes: [1],
      shipmentType: {
        from: 'test',
        to: 'test1',
        carrier: 'test-carrier',
      },
    });
  }

  /**
   * GRPC stub implementation for sync stream method
   * @param messages
   */
  @GrpcStreamMethod('orders.OrderService')
  async sync(
    messages: Observable<any>,
    metadata: Metadata,
    call: any,
  ): Promise<any> {
    // Set Set-Cookie from Metadata
    const srvMetadata = new Metadata();
	logger.debug(`sync(messages=${messages},metadata=${metadata},call=${call}): srvMetadata → ${srvMetadata}`);
    srvMetadata.add('Set-Cookie', 'test_cookie=abcd');
    call.sendMetadata(srvMetadata);

    const s = new Subject();
	logger.debug(`sync(messages=${messages},metadata=${metadata},call=${call}): s → ${s}`);
    const o = s.asObservable();
	logger.debug(`sync(messages=${messages},metadata=${metadata},call=${call}): o → ${o}`);
    messages.subscribe(msg => {
	logger.debug(`>>> Entering sync(messages=${messages},metadata=${metadata},call=${call})`);
      s.next({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
    return o;
  }

  /**
   * GRPC stub implementation for syncCall stream method (implemented through call)
   * @param stream
   */
  @GrpcStreamCall('orders.OrderService')
  async syncCall(stream: any) {
	logger.debug(`>>> Entering syncCall(stream=${stream})`);
    stream.on('data', (msg: any) => {
      stream.write({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
  }

  @GrpcStreamMethod('orders.OrderService')
  async streamReq(messages: Observable<any>): Promise<any> {
    const s = new Subject();
	logger.debug(`streamReq(messages=${messages}): s → ${s}`);
    const o = s.asObservable();
    messages.subscribe({
      next: () => {
		logger.debug(`>>> Entering streamReq(messages=${messages})`);
        s.next({
          id: 1,
          itemTypes: [1],
          shipmentType: {
            from: 'test',
            to: 'test1',
            carrier: 'test-carrier',
          },
        });
      },
      complete: () => s.complete(),
    });
    return o;
  }

  @GrpcStreamCall('orders.OrderService')
  async streamReqCall(stream: any, callback: Function) {
	logger.debug(`>>> Entering streamReqCall(stream=${stream},callback=${callback})`);
    stream.on('data', (msg: any) => {
      // process msg
    });
    stream.on('end', () => {
	logger.debug(`<<< Exiting streamReqCall(stream=${stream},callback=${callback})`);
      callback(null, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
  }
}
