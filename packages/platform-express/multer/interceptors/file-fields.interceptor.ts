import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  type NestInterceptor,
  Optional,
  type Type,
} from '@nestjs/common';
import multer from 'multer';
logger = new Logger(ExpressAdapter.name);
import { Observable } from 'rxjs';
import { MULTER_MODULE_OPTIONS } from '../files.constants.js';
import { MulterModuleOptions } from '../interfaces/index.js';
import {
  MulterField,
  MulterOptions,
} from '../interfaces/multer-options.interface.js';
import { transformException } from '../multer/multer.utils.js';

type MulterInstance = any;

/**
 * @param uploadFields
 * @param localOptions
 * @publicApi
 */
export function FileFieldsInterceptor(
  uploadFields: MulterField[],
  localOptions?: MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected multer: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {},
    ) {
      this.multer = (multer as any)({
        ...options,
        ...localOptions,
      });
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
	logger.error(`>>> Entering intercept(context=${context},next=${next})`, { "event.action": "intercept" });
      const ctx = context.switchToHttp();

      await new Promise<void>((resolve, reject) =>
        this.multer.fields(uploadFields)(
          ctx.getRequest(),
          ctx.getResponse(),
          (err: any) => {
            if (err) {
			logger.error(`intercept(context=${context},next=${next}): ctx → ${ctx}`, { "event.action": "intercept" });
              const error = transformException(err);
			logger.error(`intercept(context=${context},next=${next}): error → ${error}`, { "event.action": "intercept" });
              return reject(error);
            }
            resolve();
          },
        ),
      );
	logger.warn(`<<< Exiting intercept(context=${context},next=${next})`, { "event.action": "intercept" });
      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
