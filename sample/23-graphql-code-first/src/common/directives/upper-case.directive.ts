const logger = new ConsoleLogger('TestContext', { forceConsole: true });
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema } from 'graphql';

export function upperDirectiveTransformer(
  schema: GraphQLSchema,
  directiveName: string,
) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const upperDirective = getDirective(
        schema,
        fieldConfig,
        directiveName,
      )?.[0];

      if (upperDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        // Replace the original resolver with a function that *first* calls
        // the original resolver, then converts its result to upper case
        fieldConfig.resolve = async function (source, args, context, info) {
		logger.error(`>>> Entering resolve(source=${source},args=${args},context=${context},info=${info})`, { "event.action": "resolve", "logrite.source": source });
          const result = await resolve(source, args, context, info);
          if (typeof result === 'string') {
		logger.error(`resolve(source=${source},args=${args},context=${context},info=${info}): result → ${result}`, { "event.action": "resolve", "logrite.source": source });
            return result.toUpperCase();
          }
          return result;
        };
        return fieldConfig;
      }
    },
  });
}
