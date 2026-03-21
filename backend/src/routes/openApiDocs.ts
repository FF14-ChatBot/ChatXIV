import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';

/**
 * `openapi/openapi.yaml` next to compiled output (`dist/openapi/`, copied at build) or next to `src/` in Vitest.
 */
export function getOpenApiSpecPath(): string {
  return fileURLToPath(new URL('../../openapi/openapi.yaml', import.meta.url));
}

function readOpenApiYaml(): string {
  return readFileSync(getOpenApiSpecPath(), 'utf8');
}

/**
 * Runs handlers in order; avoids Express overload issues with `swagger-ui-express` typings.
 * Exported for unit tests (error propagation and empty chain).
 */
export function chainRequestHandlers(handlers: readonly RequestHandler[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;
    const run = (err?: unknown): void => {
      if (err !== undefined) {
        next(err);
        return;
      }
      if (index >= handlers.length) {
        next();
        return;
      }
      const fn = handlers[index];
      index += 1;
      void fn(req, res, run);
    };
    run();
  };
}

/**
 * Serves the OpenAPI YAML and Swagger UI (`/docs`). Register after global middleware, before `/v1` API routes or beside them.
 */
export function registerOpenApiDocs(app: Express): void {
  app.get('/v1/openapi.yaml', (_req: Request, res: Response) => {
    res.type('application/yaml');
    res.send(readOpenApiYaml());
  });

  const uiSetup = swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: '/v1/openapi.yaml',
    },
  });
  const swaggerStack = [...swaggerUi.serve, uiSetup] as unknown as RequestHandler[];
  app.use('/docs', chainRequestHandlers(swaggerStack));
}
