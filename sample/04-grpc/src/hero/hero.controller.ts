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
	logger.debug('>>> Entering onModuleInit()');
    this.heroesService = this.client.getService<HeroesService>('HeroesService');
	logger.debug('<<< Exiting onModuleInit()');
  }

  @Get()
  getMany(): Observable<Hero[]> {
	logger.debug('>>> Entering getMany()');
    const ids$ = new ReplaySubject<HeroById>();
    ids$.next({ id: 1 });
    ids$.next({ id: 2 });
    ids$.complete();
	const startTime: number = Date.now();

    const stream = this.heroesService.findMany(ids$.asObservable());
	logger.debug(`getMany(): stream → ${stream}`);
    return stream.pipe(toArray());
  }

  @Get(':id')
  getById(@Param('id') id: string): Observable<Hero> {
	logger.debug(`>>> Entering getById(id=${id})`);
    return this.heroesService.findOne({ id: +id });
  }

  @GrpcMethod('HeroesService')
  findOne(data: HeroById): Hero {
	logger.debug(`>>> Entering findOne(data=${data})`);
	logger.debug(`<<< Exiting findOne(data=${data})`);
    return this.items.find(({ id }) => id === data.id)!;
  }

  @GrpcStreamMethod('HeroesService')
  findMany(data$: Observable<HeroById>): Observable<Hero> {
    const hero$ = new Subject<Hero>();

    const onNext = (heroById: HeroById) => {
	logger.debug(`>>> Entering findMany(data$=${data$})`);
      const item = this.items.find(({ id }) => id === heroById.id)!;
	logger.debug(`>>> Entering onNext(heroById=${heroById})`);
      hero$.next(item);
    };
    const onComplete = () => hero$.complete();
    data$.subscribe({
      next: onNext,
      complete: onComplete,
    });

	logger.debug(`<<< Exiting findMany(data$=${data$})`);
    return hero$.asObservable();
  }
}
