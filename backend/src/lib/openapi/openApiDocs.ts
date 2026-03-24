import {
  Router,
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import type { AdminAuthMiddleware } from '../../middleware/adminAuth.js';

const PUBLIC_SPEC = 'openapi.public.yaml';
const ADMIN_SPEC = 'openapi.admin.yaml';

/**
 * `openapi/*.yaml` next to compiled output (`dist/openapi/`, copied at build) or next to `src/` in Vitest.
 */
export function getOpenApiPublicSpecPath(): string {
  return fileURLToPath(new URL(`../../../openapi/${PUBLIC_SPEC}`, import.meta.url));
}

export function getOpenApiAdminSpecPath(): string {
  return fileURLToPath(new URL(`../../../openapi/${ADMIN_SPEC}`, import.meta.url));
}

export function readPublicOpenApiYaml(): string {
  return readFileSync(getOpenApiPublicSpecPath(), 'utf8');
}

export function readAdminOpenApiYaml(): string {
  return readFileSync(getOpenApiAdminSpecPath(), 'utf8');
}

/** Parsed admin OpenAPI document for Swagger UI (inlined so the browser does not fetch YAML without auth). */
export function loadAdminOpenApiDocument(): Record<string, unknown> {
  const raw = readAdminOpenApiYaml();
  const doc = loadYaml(raw) as unknown;
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Invalid admin OpenAPI document');
  }
  return doc as Record<string, unknown>;
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

/** Public YAML (`GET /v1/openapi.yaml`) and Swagger UI at `/v1/docs/` when router is mounted at `/v1`. */
export function mountPublicOpenApiDocs(router: Router): void {
  router.get('/openapi.yaml', (_req: Request, res: Response) => {
    res.type('application/yaml');
    res.send(readPublicOpenApiYaml());
  });

  const publicUiSetup = swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: '/v1/openapi.yaml',
    },
  });
  const publicSwaggerStack = [...swaggerUi.serve, publicUiSetup] as unknown as RequestHandler[];
  router.use('/docs', chainRequestHandlers(publicSwaggerStack));
}

/**
 * Handlers for admin Swagger UI (mount at `/docs` on the `/v1/admin` router, after admin auth).
 * Spec is inlined so the browser does not fetch YAML without auth.
 */
export function createAdminSwaggerUiHandlers(): RequestHandler[] {
  const adminDoc = loadAdminOpenApiDocument();
  const adminUiSetup = swaggerUi.setup(adminDoc, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  return [...swaggerUi.serve, adminUiSetup] as unknown as RequestHandler[];
}

/**
 * Test helper: public docs plus a minimal `/v1/admin` router (auth + `/docs` only).
 * Production mounts admin Swagger via {@link createAdminRouter}.
 */
export function registerOpenApiDocs(app: Express, adminAuth: AdminAuthMiddleware): void {
  const publicRouter = Router();
  mountPublicOpenApiDocs(publicRouter);
  app.use('/v1', publicRouter);
  const adminDocsOnly = Router();
  adminDocsOnly.use(adminAuth.handler);
  adminDocsOnly.use('/docs', chainRequestHandlers(createAdminSwaggerUiHandlers()));
  app.use('/v1/admin', adminDocsOnly);
}

/** `GET /v1/admin/openapi.yaml` — same auth as other admin routes. */
export function createAdminOpenApiYamlHandler(): RequestHandler {
  return (_req: Request, res: Response) => {
    res.type('application/yaml');
    res.send(readAdminOpenApiYaml());
  };
}
