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
	logger.error(`>>> Entering call(id=${id})`, { "event.action": "call", "logrite.id": id });
    const svc = this.client.getService<any>('OrderService');
	logger.error(`call(id=${id}): svc → ${svc}`, { "event.action": "call", "logrite.id": id });
    return svc.find({ id });
  }

  /**
   * HTTP Proxy entry for support client-side stream find method
   * @param id
   */
  @Post('client-streaming')
  @HttpCode(200)
  stream(): Observable<number> {
	logger.error('>>> Entering stream()', { "event.action": "stream" });
    const svc = this.client.getService<any>('OrderService');
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
	logger.error(`stream(): svc → ${svc}`, { "event.action": "stream" });
	logger.warn('<<< Exiting stream()', { "event.action": "stream" });
    return svc.streamReq(upstream);
  }

  /**
   * GRPC stub for Find method
   * @param id
   */
  @GrpcMethod('orders.OrderService')
  async find({ id }: { id: number }): Promise<any> {
	logger.error('>>> Entering find()', { "event.action": "find" });
	logger.warn('<<< Exiting find()', { "event.action": "find" });
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
	logger.error(`>>> Entering sync(messages=${messages},metadata=${metadata},call=${call})`, { "event.action": "sync", "logrite.messages": messages, "logrite.metadata": metadata, "logrite.call": call });
    // Set Set-Cookie from Metadata
    const srvMetadata = new Metadata();
	logger.error(`sync(messages=${messages},metadata=${metadata},call=${call}): srvMetadata → ${srvMetadata}`, { "event.action": "sync", "logrite.messages": messages, "logrite.metadata": metadata, "logrite.call": call });
    srvMetadata.add('Set-Cookie', 'test_cookie=abcd');
    call.sendMetadata(srvMetadata);

    const s = new Subject();
	logger.error(`sync(messages=${messages},metadata=${metadata},call=${call}): s → ${s}`, { "event.action": "sync", "logrite.messages": messages, "logrite.metadata": metadata, "logrite.call": call });
    const o = s.asObservable();
	logger.error(`sync(messages=${messages},metadata=${metadata},call=${call}): o → ${o}`, { "event.action": "sync", "logrite.messages": messages, "logrite.metadata": metadata, "logrite.call": call });
    messages.subscribe(msg => {
	logger.warn(`<<< Exiting sync(messages=${messages},metadata=${metadata},call=${call})`, { "event.action": "sync", "logrite.messages": messages, "logrite.metadata": metadata, "logrite.call": call });
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
	logger.error(`>>> Entering syncCall(stream=${stream})`, { "event.action": "syncCall", "logrite.stream": stream });
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
	logger.error(`>>> Entering streamReq(messages=${messages})`, { "event.action": "streamReq", "logrite.messages": messages });
    const s = new Subject();
    const o = s.asObservable();
    messages.subscribe({
      next: () => {
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
	logger.error(`streamReq(messages=${messages}): o → ${o}`, { "event.action": "streamReq", "logrite.messages": messages });
    return o;
  }

  @GrpcStreamCall('orders.OrderService')
  async streamReqCall(stream: any, callback: Function) {
	logger.error(`>>> Entering streamReqCall(stream=${stream},callback=${callback})`, { "event.action": "streamReqCall", "logrite.stream": stream, "logrite.callback": callback });
    stream.on('data', (msg: any) => {
      // process msg
    });
    stream.on('end', () => {
	logger.warn(`<<< Exiting streamReqCall(stream=${stream},callback=${callback})`, { "event.action": "streamReqCall", "logrite.stream": stream, "logrite.callback": callback });
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
