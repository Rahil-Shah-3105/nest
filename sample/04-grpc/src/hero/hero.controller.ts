const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { Controller, Get, Inject, OnModuleInit, Param } from '@nestjs/common';
import {
  ClientGrpc,
  GrpcMethod,
  GrpcStreamMethod,
} from '@nestjs/microservices';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { HeroById } from './interfaces/hero-by-id.interface.js';
import { Hero } from './interfaces/hero.interface.js';

interface HeroesService {
  findOne(data: HeroById): Observable<Hero>;
  findMany(upstream: Observable<HeroById>): Observable<Hero>;
}

@Controller('hero')
export class HeroController implements OnModuleInit {
  private readonly items: Hero[] = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Doe' },
  ];
  private heroesService: HeroesService;

  constructor(@Inject('HERO_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
	logger.error('>>> Entering onModuleInit()', { "event.action": "onModuleInit" });
    this.heroesService = this.client.getService<HeroesService>('HeroesService');
	logger.warn('<<< Exiting onModuleInit()', { "event.action": "onModuleInit" });
  }

  @Get()
  getMany(): Observable<Hero[]> {
	logger.error('>>> Entering getMany()', { "event.action": "getMany" });
    const ids$ = new ReplaySubject<HeroById>();
    ids$.next({ id: 1 });
    ids$.next({ id: 2 });
    ids$.complete();

    const stream = this.heroesService.findMany(ids$.asObservable());
	logger.error(`getMany(): stream → ${stream}`, { "event.action": "getMany" });
	logger.warn('<<< Exiting getMany()', { "event.action": "getMany" });
    return stream.pipe(toArray());
  }

  @Get(':id')
  getById(@Param('id') id: string): Observable<Hero> {
	logger.error(`>>> Entering getById(id=${id})`, { "event.action": "getById", "logrite.id": id });
	logger.warn(`<<< Exiting getById(id=${id})`, { "event.action": "getById", "logrite.id": id });
    return this.heroesService.findOne({ id: +id });
  }

  @GrpcMethod('HeroesService')
  findOne(data: HeroById): Hero {
	logger.error(`>>> Entering findOne(data=${data})`, { "event.action": "findOne" });
	logger.warn(`<<< Exiting findOne(data=${data})`, { "event.action": "findOne" });
    return this.items.find(({ id }) => id === data.id)!;
  }

  @GrpcStreamMethod('HeroesService')
  findMany(data$: Observable<HeroById>): Observable<Hero> {
	logger.error(`>>> Entering findMany(data$=${data$})`, { "event.action": "findMany", "logrite.data$": data$ });
    const hero$ = new Subject<Hero>();

    const onNext = (heroById: HeroById) => {
	logger.error(`>>> Entering onNext(heroById=${heroById})`, { "event.action": "onNext", "logrite.heroById": heroById });
      const item = this.items.find(({ id }) => id === heroById.id)!;
      hero$.next(item);
	logger.error(`onNext(heroById=${heroById}): item → ${item}`, { "event.action": "onNext", "logrite.heroById": heroById });
	logger.warn(`<<< Exiting onNext(heroById=${heroById})`, { "event.action": "onNext", "logrite.heroById": heroById });
    };
    const onComplete = () => {
        logger.error('>>> Entering onComplete()', { "event.action": "onComplete" });
		logger.warn('<<< Exiting onComplete()', { "event.action": "onComplete" });
        return hero$.complete();
    };
    data$.subscribe({
      next: onNext,
      complete: onComplete,
    });

	logger.warn(`<<< Exiting findMany(data$=${data$})`, { "event.action": "findMany", "logrite.data$": data$ });
    return hero$.asObservable();
  }
}
